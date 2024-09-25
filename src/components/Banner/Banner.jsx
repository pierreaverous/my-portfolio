"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {OrbitControls, useCursor} from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import styles from "./banner.module.scss";
import {EffectComposer, Outline, Bloom, DepthOfField, Glitch, } from "@react-three/postprocessing"; // Import post-processing


// Utility function to get cube positions from a letter grid
const getLetterPositions = (letterGrid, baseX, baseY) => {
    const positions = [];
    const rows = letterGrid.length;
    const cols = letterGrid[0].length;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (letterGrid[row][col] === 1) {
                positions.push([baseX + col, baseY - row, 0.5]); // z-position
            }
        }
    }
    return positions;
};

// Function to generate grid data and starting columns for letters
const generateGridData = (letters) => {
    const rows = letters[0].length;
    const totalCols = letters.reduce((acc, letter) => acc + letter[0].length + 1, -1);
    const gridData = Array.from({ length: rows }, () => Array(totalCols).fill(0));

    let currentCol = 0;
    const letterStartCols = [];

    letters.forEach((letter) => {
        letterStartCols.push(currentCol); // Record the starting column of the letter
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < letter[0].length; col++) {
                gridData[row][currentCol + col] = letter[row][col];
            }
        }
        currentCol += letter[0].length + 1; // Add space between letters
    });

    return { gridData, letterStartCols };
};

// Cell component representing each grid cell
const Cell = React.forwardRef(
    ({ position, isActive, isHovered, onClick, animationStep }, ref) => {
        useCursor(isHovered);
        return (
            <group>
                <mesh
                    ref={ref}
                    position={position}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        if (isActive && animationStep === "filling") onClick(position, true);
                    }}
                    onPointerOut={(e) => {
                        e.stopPropagation();
                        if (isActive && animationStep === "filling") onClick(position, false);
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isActive && animationStep === "filling") onClick(position);
                    }}
                    receiveShadow
                    visible={animationStep !== "disappear"} // Hide cells during disappearance
                >
                    <boxGeometry args={[1, 1, 0.5]} />
                    <meshStandardMaterial
                        color={
                            isHovered ? "#007AFF" : isActive ? "#d8d7d7" : "#f5f5f5"
                        }
                    />
                </mesh>
                <lineSegments position={position} visible={animationStep !== "disappear"}>
                    <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1, 0.5)]} />
                    <lineBasicMaterial attach="material" color="#d3d3d3" linewidth={0.5} />
                </lineSegments>
            </group>
        );
    }
);

// Grid component to display the grid with letters
const Grid = ({
                  gridData,
                  hoveredCell,
                  setHoveredCell,
                  onCellClick,
                  animationStep,
              }) => {
    const rows = gridData.length;
    const cols = gridData[0].length;

    return (
        <group>
            {gridData.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                    const isActive = cell === 1;
                    const position = [
                        colIndex - Math.floor(cols / 2),
                        Math.floor(rows / 2) - rowIndex,
                        0,
                    ];

                    const isHovered = hoveredCell
                        ? hoveredCell[0] === position[0] &&
                        hoveredCell[1] === position[1]
                        : false;

                    return (
                        <Cell
                            key={`${rowIndex}-${colIndex}`}
                            position={position}
                            isActive={isActive}
                            isHovered={isHovered}
                            onClick={(pos, hover) => {
                                if (hover !== undefined) {
                                    setHoveredCell(hover ? pos : null);
                                } else {
                                    onCellClick(pos);
                                }
                            }}
                            animationStep={animationStep}
                        />
                    );
                })
            )}
        </group>
    );
};

// DraggableCube component to manage draggable cubes
const DraggableCube = ({
                           position,
                           cubeIndex,
                           onDrop,
                           planeRef,
                           animationStep,
                       }) => {
    const meshRef = useRef();
    const { raycaster, mouse, camera } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isDropping, setIsDropping] = useState(false);
    const [isDisappearing, setIsDisappearing] = useState(false);
    useCursor(isDragging);

    // Disappearance animation
    useEffect(() => {
        if (animationStep === "disappear" && meshRef.current) {
            setIsDisappearing(true);
        }
    }, [animationStep]);

    useFrame(() => {
        if (animationStep !== "filling") return; // Only allow dragging during 'filling'

        if (isDragging && meshRef.current && planeRef.current) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(planeRef.current);

            if (intersects.length > 0) {
                const intersect = intersects[0];

                const snappedX = Math.round(intersect.point.x);
                const snappedY = Math.round(intersect.point.y);

                meshRef.current.position.set(snappedX, snappedY, 1.2); // Height during drag
            }
        } else if (isDropping && meshRef.current) {
            if (meshRef.current.position.z > 0.5) {
                meshRef.current.position.z -= 0.2;
                if (meshRef.current.position.z <= 0.5) {
                    meshRef.current.position.z = 0.5;
                    setIsDropping(false);
                    onDrop(meshRef.current.position, cubeIndex);
                }
            }
        }

        // Disappearance animation
        if (isDisappearing && meshRef.current) {
            // Gradually reduce scale and opacity to disappear
            meshRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), 0.05);
            meshRef.current.material.opacity = THREE.MathUtils.lerp(
                meshRef.current.material.opacity,
                0,
                0.05
            );
            if (meshRef.current.scale.x < 0.01) {
                // Once the animation is complete, hide the mesh
                meshRef.current.visible = false;
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onPointerDown={(e) => {
                e.stopPropagation();
                if (animationStep === "filling") setIsDragging(true);
            }}
            onPointerUp={(e) => {
                e.stopPropagation();
                if (animationStep === "filling") {
                    setIsDragging(false);
                    setIsDropping(true);
                }
            }}
            scale={isDragging ? [1.1, 1.1, 1.1] : [1, 1, 1]}
            castShadow
            visible={animationStep !== "disappear"} // Control visibility
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color="#0400ff"
                opacity={0.7}
                transparent={true}
                roughness={0.7}
                metalness={0.5}
                envMapIntensity={10}
            />
        </mesh>
    );
};

// LogoMeshes component to load and add SVG meshes with extrusion
const LogoMeshes = ({ svgUrl, groupRef, setMeshesLoaded }) => {
    useEffect(() => {
        if (groupRef.current) {
            console.log("Starting SVG logo loading...");
            const loader = new SVGLoader();
            loader.load(
                svgUrl,
                (data) => {
                    console.log("SVG logo loaded successfully.");
                    const paths = data.paths;
                    const material = new THREE.MeshStandardMaterial({
                        color: "#0400ff",
                        side: THREE.DoubleSide,
                        metalness: 0.5,
                        roughness: 0.5,
                        transparent: true,
                        opacity: 0 // Start with full transparency
                    });

                    paths.forEach((path, pathIndex) => {
                        const shapes = path.toShapes(true);
                        shapes.forEach((shape, shapeIndex) => {
                            const geometry = new THREE.ExtrudeGeometry(shape, {
                                depth: 10, // Depth for 3D appearance
                                bevelEnabled: false,
                            });
                            const mesh = new THREE.Mesh(geometry, material);

                            // Save the final position
                            const finalPosition = geometry.boundingBox.getCenter(new THREE.Vector3());

                            // Start each mesh at the center
                            mesh.position.set(0, 0, 0);
                            mesh.scale.set(0.1, 0.1, 0.1); // Start with a small scale

                            // Add the mesh to the group
                            groupRef.current.add(mesh);
                            console.log(`Mesh added: Path ${pathIndex}, Shape ${shapeIndex}`);

                            // Animate the mesh's movement to its final position
                            let frame = 0;
                            const animate = () => {
                                if (frame <= 100) {
                                    requestAnimationFrame(animate);
                                    // Lerp the position from the center to the final position
                                    mesh.position.lerp(finalPosition, 0.05);
                                    mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05); // Gradually scale up
                                    mesh.material.opacity += 0.05; // Fade in
                                    frame++;
                                } else {
                                    mesh.position.copy(finalPosition); // Ensure the final position is correct
                                }
                            };
                            animate();
                        });
                    });

                    setMeshesLoaded(true);
                },
                (xhr) => {
                    console.log(`Loading SVG: ${Math.round((xhr.loaded / xhr.total) * 100)}% completed.`);
                },
                (error) => {
                    console.error("Error loading SVG:", error);
                }
            );
        }
    }, [svgUrl, groupRef, setMeshesLoaded]);

    return null;
};


const LogoDisplay = ({ svgUrl, animationStep, rotation }) => {
    const groupRef = useRef();
    const [meshesLoaded, setMeshesLoaded] = useState(false);
    const [scale, setScale] = useState(0.01); // Start with a small scale

    useEffect(() => {
        if (animationStep === "logo") {
            console.log("Logo animation step activated.");
        }
    }, [animationStep]);

    // Gradually scale up the logo during the 'logo' animation step
    useFrame(() => {
        if (animationStep === "logo" && meshesLoaded && groupRef.current) {
            const targetScale = 0.05; // Adjust target scale as needed
            const newScale = THREE.MathUtils.lerp(scale, targetScale, 0.09);
            setScale(newScale);
            groupRef.current.scale.set(newScale, newScale, newScale);
        }
    });

    return (
        <>
            <group
                ref={groupRef}
                position={[-9.5, 8, 3]}
                rotation={rotation} // Apply rotation
                visible={animationStep === "logo"}
            >
                {/* Add the SVG meshes to the group */}
                {animationStep === "logo" && (
                    <LogoMeshes
                        svgUrl={svgUrl}
                        groupRef={groupRef}
                        setMeshesLoaded={setMeshesLoaded}
                    />
                )}
            </group>

            {/* Apply bloom, glow, depth of field, and glitch effects */}
            {animationStep === "logo" && (
                <EffectComposer>
                    {/* Bloom effect */}
                    <Bloom
                        luminanceThreshold={0.1} // Adjust threshold for glowing parts
                        luminanceSmoothing={0.9}
                        intensity={1.5} // Intensity of the bloom effect
                    />
                    {/* Outline effect for glow */}
                    <Outline
                        blur
                        edgeStrength={3} // Adjust for stronger glow
                        pulseSpeed={0.6}
                        visibleEdgeColor="#ffffff"
                        hiddenEdgeColor="#000000"
                        width={1024}
                        height={1024}
                    />
                    {/* Depth of Field (Blur) effect */}

                    {/*/!* Optional: Glitch effect for a digital distortion *!/*/}
                    {/*<Glitch*/}
                    {/*    delay={[2.5, 5.5]} // Time between glitches*/}
                    {/*    duration={[0.3, 1.0]} // Duration of each glitch*/}
                    {/*    strength={[0.1, 0.3]} // Intensity of the glitch effect*/}
                    {/*/>*/}
                </EffectComposer>
            )}
        </>
    );
};
// CameraController component to manage camera animations
const CameraController = ({setAnimationStep}) => {
    const {camera} = useThree();
    const [completed, setCompleted] = useState(false);
    const targetPosition = new THREE.Vector3(0, -5, 15);
    const targetRotation = new THREE.Euler(0.18, 0, 0); // Adjust as needed

    useFrame(() => {
        if (!completed) {
            // Smoothly interpolate the camera's position
            camera.position.lerp(targetPosition, 0.02);
            // Smoothly interpolate the camera's rotation
            camera.rotation.x = THREE.MathUtils.lerp(
                camera.rotation.x,
                targetRotation.x,
                0.02
            );

            // Check if the camera has reached the target position and rotation
            if (
                camera.position.distanceTo(targetPosition) < 0.1 &&
                Math.abs(camera.rotation.x - targetRotation.x) < 0.01
            ) {
                console.log("Camera animation completed. Transitioning to 'disappear' step.");
                setAnimationStep("disappear");
                setCompleted(true);
            }
        }
    });

    return null;
};

// Main Banner component
export default function Banner() {
    const svgUrl = "/WEB.svg"; // Ensure this path is correct and accessible

    // Define your letters
    const letters = [
        // Letter P
        [
            [1, 1, 1, 1, 1], // Row 1
            [1, 0, 0, 0, 1], // Row 2
            [1, 1, 1, 1, 1], // Row 3
            [1, 0, 0, 0, 0], // Row 4
            [1, 0, 0, 0, 0], // Row 5
        ],
        // Letter G
        [
            [0, 1, 1, 1, 0], // Row 1
            [1, 0, 0, 0, 0], // Row 2
            [1, 0, 1, 1, 1], // Row 3
            [1, 0, 0, 0, 1], // Row 4
            [0, 1, 1, 1, 0], // Row 5
        ],
        // Letter A
        [
            [0, 1, 1, 1, 0], // Row 1
            [1, 0, 0, 0, 1], // Row 2
            [1, 1, 1, 1, 1], // Row 3
            [1, 0, 0, 0, 1], // Row 4
            [1, 0, 0, 0, 1], // Row 5
        ],
    ];

    // Generate grid data by combining letters
    const { gridData, letterStartCols } = generateGridData(letters);

    // Initial cube positions
    const initialCubePositions = [
        [0, -6, 0.5],
        [2, -6, 0.5],
        [-2, -6, 0.5],
        [4, -6, 0.5],
        [-4, -6, 0.5],
        [6, -6, 0.5],
    ];

    // State variables
    const [hoveredCell, setHoveredCell] = useState(null);
    const [filledLetters, setFilledLetters] = useState(
        new Array(letters.length).fill(false)
    );
    const [letterCubeIndices, setLetterCubeIndices] = useState(
        new Array(letters.length).fill().map(() => new Set())
    );
    const [newCubes, setNewCubes] = useState([]);
    const [cubePositions, setCubePositions] = useState(initialCubePositions);

    const [animationStep, setAnimationStep] = useState("filling"); // Steps: 'filling', 'camera', 'disappear', 'logo'

    const planeRef = useRef();

    // Check if all letters are filled to transition to 'camera' step
    useEffect(() => {
        if (filledLetters.every(Boolean) && animationStep === "filling") {
            console.log("All letters filled. Transitioning to 'camera' step.");
            setAnimationStep("camera");
        }
    }, [filledLetters, animationStep]);

    // Handle 'disappear' animation step
    useEffect(() => {
        if (animationStep === "disappear") {
            console.log("Starting disappearance animation.");

            // Define duration for disappearance
            const disappearanceDuration = 1000; // 2 seconds

            // Transition to 'logo' step after disappearance duration
            const timeout = setTimeout(() => {
                console.log("Disappearance animation completed. Transitioning to 'logo' step.");
                setAnimationStep("logo");
            }, disappearanceDuration);

            return () => clearTimeout(timeout);
        }
    }, [animationStep]);

    // Handle cube drop on the grid
    const handleCubeDrop = (position, cubeIndex) => {
        if (animationStep !== "filling") return; // Prevent dropping during other animations

        // Determine which letter the cube was dropped on based on X position
        let letterIndex = -1;
        let cumulativeOffset = 0;

        for (let i = 0; i < letters.length; i++) {
            const letterWidth = letters[i][0].length;
            const startX = cumulativeOffset - Math.floor(gridData[0].length / 2);
            const endX = startX + letterWidth;
            if (position.x >= startX && position.x < endX) {
                letterIndex = i;
                break;
            }
            cumulativeOffset += letterWidth + 1; // Add space between letters
        }

        if (letterIndex !== -1) {
            // Check if the cube is among the initial cubes
            if (cubeIndex < initialCubePositions.length) {
                const updatedLetterCubeIndices = [...letterCubeIndices];
                updatedLetterCubeIndices[letterIndex].add(cubeIndex);
                setLetterCubeIndices(updatedLetterCubeIndices);

                // If at least two cubes are placed on the letter, fill the letter
                if (
                    updatedLetterCubeIndices[letterIndex].size >= 2 &&
                    !filledLetters[letterIndex]
                ) {
                    fillLetter(letterIndex);
                }
            }
        }
    };

    // Function to fill the letter with falling cubes
    const fillLetter = (letterIndex) => {
        const baseX =
            letterStartCols[letterIndex] - Math.floor(gridData[0].length / 2);
        const baseY = Math.floor(gridData.length / 2);

        const allPositions = getLetterPositions(
            letters[letterIndex],
            baseX,
            baseY
        );

        // Sort positions for falling effect
        allPositions.sort((a, b) => b[1] - a[1]);

        // Add cubes with a delay for staggered effect
        allPositions.forEach((pos, idx) => {
            setTimeout(() => {
                setNewCubes((prev) => [...prev, pos]);
            }, idx * 50); // 50ms delay between each cube
        });

        // Update filled letters state
        const updatedFilledLetters = [...filledLetters];
        updatedFilledLetters[letterIndex] = true;
        setFilledLetters(updatedFilledLetters);

        // Reset cubes placed on the letter
        const updatedLetterCubeIndices = [...letterCubeIndices];
        updatedLetterCubeIndices[letterIndex] = new Set();
        setLetterCubeIndices(updatedLetterCubeIndices);

        // Reset positions of used cubes to initial positions
        const updatedCubePositions = [...cubePositions];
        updatedLetterCubeIndices[letterIndex].forEach((idx) => {
            updatedCubePositions[idx] = initialCubePositions[idx];
        });
        setCubePositions(updatedCubePositions);
    };

    return (
        <div className={styles.banner}>
            <Canvas
                camera={{ position: [0, -5, 15], fov: 50 }} // Initial camera position
                shadows
                color={"#FFFFFF"}
            >
                {/* Ambient and Directional Lights */}
                <ambientLight intensity={2} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                {/* Render CameraController only during 'camera' step */}
                {animationStep === "camera" && (
                    <CameraController
                        setAnimationStep={setAnimationStep}
                    />
                )}

                {/* Render Grid, newCubes, and DraggableCubes during 'filling', 'camera', and 'disappear' steps */}
                {(animationStep === "filling" ||
                    animationStep === "camera" ||
                    animationStep === "disappear") && (
                    <>
                        <Grid
                            gridData={gridData}
                            hoveredCell={hoveredCell}
                            setHoveredCell={setHoveredCell}
                            onCellClick={handleCubeDrop}
                            animationStep={animationStep}
                        />
                        {newCubes.map((position, index) => (
                            <mesh
                                key={`new-cube-${index}`}
                                position={position}
                                castShadow
                                visible={animationStep !== "logo"} // Hide during 'logo' step
                            >
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial
                                    color="#0400ff"
                                    opacity={0.7}
                                    transparent={true}
                                    roughness={0.7}
                                    metalness={0.5}
                                    envMapIntensity={10}
                                />
                            </mesh>
                        ))}
                        {cubePositions.map((position, index) => (
                            <DraggableCube
                                key={`cube-${index}`}
                                position={position}
                                cubeIndex={index}
                                onDrop={handleCubeDrop}
                                planeRef={planeRef}
                                animationStep={animationStep}
                            />
                        ))}
                    </>
                )}

                {/* Invisible plane for dragging */}
                <mesh
                    ref={planeRef}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    visible={false} // Make the plane invisible
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* Render LogoDisplay only during 'logo' step */}
                {animationStep === "logo" && (
                    <>

                        <LogoDisplay
                            svgUrl={svgUrl}
                            animationStep={animationStep}
                            rotation={[Math.PI, 0, 0]}
                            // Rotation of 180 degrees on the X-axis
                        />
                        <OrbitControls/>
                    </>

                )}
            </Canvas>
        </div>
    );
}
