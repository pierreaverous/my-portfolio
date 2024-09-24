"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import styles from "./banner.module.scss";

// Fonction utilitaire pour obtenir les positions des cubes à partir de la matrice d'une lettre
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

// Fonction pour générer les données de la grille et les colonnes de départ des lettres
const generateGridData = (letters) => {
    const rows = letters[0].length;
    const totalCols = letters.reduce((acc, letter) => acc + letter[0].length + 1, -1);
    const gridData = Array.from({ length: rows }, () => Array(totalCols).fill(0));

    let currentCol = 0;
    const letterStartCols = [];

    letters.forEach((letter) => {
        letterStartCols.push(currentCol); // Enregistrer la colonne de départ de la lettre
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < letter[0].length; col++) {
                gridData[row][currentCol + col] = letter[row][col];
            }
        }
        currentCol += letter[0].length + 1; // Ajouter un espace entre les lettres
    });

    return { gridData, letterStartCols };
};

// Composant Cell représentant chaque case de la grille
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
                    visible={animationStep !== "disappear"} // Cacher les cases lors de la disparition
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

// Composant Grid pour afficher la grille avec les lettres
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

// Composant DraggableCube pour gérer le cube à déplacer
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

    // Animation de disparition
    useEffect(() => {
        if (animationStep === "disappear" && meshRef.current) {
            setIsDisappearing(true);
        }
    }, [animationStep]);

    useFrame(() => {
        if (isDragging && meshRef.current && planeRef.current) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(planeRef.current);

            if (intersects.length > 0) {
                const intersect = intersects[0];

                const snappedX = Math.round(intersect.point.x);
                const snappedY = Math.round(intersect.point.y);

                meshRef.current.position.set(snappedX, snappedY, 1.2); // Hauteur pendant le drag
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

        // Animation de disparition
        if (isDisappearing && meshRef.current) {
            // Réduire l'échelle et l'opacité pour faire disparaître
            meshRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), 0.05);
            meshRef.current.material.opacity = THREE.MathUtils.lerp(
                meshRef.current.material.opacity,
                0,
                0.05
            );
            if (meshRef.current.scale.x < 0.01) {
                // Une fois l'animation terminée, cacher le mesh
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

// Composant enfant pour charger et ajouter les meshes du logo SVG
// Composant enfant pour charger et ajouter les meshes du logo SVG
const LogoMeshes = ({ svgUrl, groupRef, setMeshesLoaded }) => {
    useEffect(() => {
        if (groupRef.current) {
            console.log("Début du chargement du logo SVG...");
            const loader = new SVGLoader();
            loader.load(
                svgUrl,
                (data) => {
                    console.log("Logo SVG chargé avec succès.");
                    const paths = data.paths;
                    const material = new THREE.MeshBasicMaterial({
                        color: "#0400ff",
                        side: THREE.DoubleSide,
                        depthWrite: false,
                        transparent: true,
                        opacity: 0.8,
                    });

                    paths.forEach((path, pathIndex) => {
                        const shapes = path.toShapes(true);
                        shapes.forEach((shape, shapeIndex) => {
                            const geometry = new THREE.ShapeGeometry(shape);
                            const mesh = new THREE.Mesh(geometry, material);
                            groupRef.current.add(mesh);
                            console.log(`Mesh ajouté: Path ${pathIndex}, Shape ${shapeIndex}`);
                        });
                    });

                    setMeshesLoaded(true);
                },
                (xhr) => {
                    console.log(`Chargement du SVG: ${Math.round((xhr.loaded / xhr.total) * 100)}% complété.`);
                },
                (error) => {
                    console.error("Erreur lors du chargement du SVG:", error);
                }
            );
        }
    }, [svgUrl, groupRef, setMeshesLoaded]);

    return null;
};

// Composant pour afficher le logo SVG en 3D avec animation stylée
const LogoDisplay = ({ svgUrl, animationStep }) => {
    const groupRef = useRef();
    const [meshesLoaded, setMeshesLoaded] = useState(false);

    useEffect(() => {
        if (animationStep === "logo") {
            console.log("Étape d'animation 'logo' activée.");
        }
    }, [animationStep]);

    // Animation de transition 3D
    useFrame(() => {
        if (animationStep === "logo" && meshesLoaded && groupRef.current) {
            // Augmenter l'échelle progressivement
            if (groupRef.current.scale.x < 1) {
                const newScale = THREE.MathUtils.lerp(
                    groupRef.current.scale.x,
                    0,
                    0.05
                );
                groupRef.current.scale.set(newScale, newScale, newScale);
                console.log(`Échelle du groupe SVG: ${newScale}`);
            }

            // Rotation douce
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        animationStep === "logo" && (
            <group ref={groupRef} position={[0, -5, 15]}>
                {/* Les meshes sont ajoutés via LogoMeshes */}
                <LogoMeshes
                    svgUrl={svgUrl}
                    groupRef={groupRef}
                    setMeshesLoaded={setMeshesLoaded}
                />
            </group>
        )
    );
};

// Composant CameraController pour gérer l'animation de la caméra
const CameraController = ({ animationStep, targetRotation, setAnimationStep }) => {
    const { camera } = useThree();
    const [completed, setCompleted] = useState(false);

    useFrame(() => {
        if (animationStep === "camera" && !completed) {
            // Incliner la caméra progressivement vers targetRotation.x
            camera.rotation.x = THREE.MathUtils.lerp(
                camera.rotation.x,
                targetRotation,
                0.02
            );

            // Vérifier si l'animation est terminée
            if (Math.abs(camera.rotation.x - targetRotation) < 0.001) {
                console.log("Animation de la caméra terminée. Passage à l'étape 'disappear'.");
                setAnimationStep("disappear");
                setCompleted(true);
            }
        }
    });

    return null;
};

// Composant principal Banner
export default function Banner() {
    const cellSize = 1;
    const svgUrl = "/WEB.svg"; // Assurez-vous que ce chemin est correct et que le fichier est accessible

    // Vos lettres telles que vous les avez définies
    const letters = [
        // Lettre P
        [
            [1, 1, 1, 1, 1], // Ligne 1
            [1, 0, 0, 0, 1], // Ligne 2
            [1, 1, 1, 1, 1], // Ligne 3
            [1, 0, 0, 0, 0], // Ligne 4
            [1, 0, 0, 0, 0], // Ligne 5
        ],
        // Lettre G
        [
            [0, 1, 1, 1, 0], // Ligne 1
            [1, 0, 0, 0, 0], // Ligne 2
            [1, 0, 1, 1, 1], // Ligne 3
            [1, 0, 0, 0, 1], // Ligne 4
            [0, 1, 1, 1, 0], // Ligne 5
        ],
        // Lettre A
        [
            [0, 1, 1, 1, 0], // Ligne 1
            [1, 0, 0, 0, 1], // Ligne 2
            [1, 1, 1, 1, 1], // Ligne 3
            [1, 0, 0, 0, 1], // Ligne 4
            [1, 0, 0, 0, 1], // Ligne 5
        ],
    ];

    // Générer les données de la grille en combinant les lettres
    const { gridData, letterStartCols } = generateGridData(letters);

    // Positions initiales des cubes à déplacer
    const initialCubePositions = [
        [0, -6, 0.5],
        [2, -6, 0.5],
        [-2, -6, 0.5],
        [4, -6, 0.5],
        [-4, -6, 0.5],
        [6, -6, 0.5],
    ];

    const [hoveredCell, setHoveredCell] = useState(null);
    const [filledLetters, setFilledLetters] = useState(
        new Array(letters.length).fill(false)
    );
    const [letterCubeIndices, setLetterCubeIndices] = useState(
        new Array(letters.length).fill().map(() => new Set())
    );
    const [newCubes, setNewCubes] = useState([]);
    const [cubePositions, setCubePositions] = useState(initialCubePositions);

    const [animationStep, setAnimationStep] = useState("filling"); // Étapes: 'filling', 'camera', 'disappear', 'logo'

    const planeRef = useRef();

    // Vérifier si toutes les lettres sont remplies
    useEffect(() => {
        if (filledLetters.every(Boolean) && animationStep === "filling") {
            console.log("Toutes les lettres sont remplies. Passage à l'étape 'camera'.");
            setAnimationStep("camera");
        }
    }, [filledLetters, animationStep]);

    // Gestion de l'étape 'disappear'
    useEffect(() => {
        if (animationStep === "disappear") {
            console.log("Début de l'animation de disparition des cubes et des cases.");

            // Définir une durée appropriée pour l'animation de disparition
            const disappearanceDuration = 2000; // 2 secondes

            // Utiliser un timeout pour passer à l'étape 'logo' après la durée de disparition
            const timeout = setTimeout(() => {
                console.log("Animation de disparition terminée. Passage à l'étape 'logo'.");
                setAnimationStep("logo");
            }, disappearanceDuration);

            return () => clearTimeout(timeout);
        }
    }, [animationStep]);

    // Gestion du dépôt d'un cube sur la grille
    const handleCubeDrop = (position, cubeIndex) => {
        if (animationStep !== "filling") return; // Empêcher le dépôt pendant d'autres animations

        // Détecter la lettre correspondante en fonction de la position X
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
            cumulativeOffset += letterWidth + 1; // Ajouter un espace entre les lettres
        }

        if (letterIndex !== -1) {
            // Vérifier si le cube est parmi les cubes initiaux
            if (cubeIndex < initialCubePositions.length) {
                const updatedLetterCubeIndices = [...letterCubeIndices];
                updatedLetterCubeIndices[letterIndex].add(cubeIndex);
                setLetterCubeIndices(updatedLetterCubeIndices);

                // Si au moins deux cubes sont placés sur la lettre
                if (
                    updatedLetterCubeIndices[letterIndex].size >= 2 &&
                    !filledLetters[letterIndex]
                ) {
                    fillLetter(letterIndex);
                }
            }
        }
    };

    // Fonction pour remplir la lettre avec les cubes qui tombent
    const fillLetter = (letterIndex) => {
        const baseX =
            letterStartCols[letterIndex] - Math.floor(gridData[0].length / 2);
        const baseY = Math.floor(gridData.length / 2);

        const allPositions = getLetterPositions(
            letters[letterIndex],
            baseX,
            baseY
        );

        // Trier les positions pour l'effet de chute
        allPositions.sort((a, b) => b[1] - a[1]);

        // Ajouter les cubes avec un délai
        allPositions.forEach((pos, idx) => {
            setTimeout(() => {
                setNewCubes((prev) => [...prev, pos]);
            }, idx * 50); // Délai de 50ms entre chaque cube
        });

        // Mettre à jour l'état des lettres remplies
        const updatedFilledLetters = [...filledLetters];
        updatedFilledLetters[letterIndex] = true;
        setFilledLetters(updatedFilledLetters);

        // Réinitialiser les cubes placés sur la lettre
        const updatedLetterCubeIndices = [...letterCubeIndices];
        updatedLetterCubeIndices[letterIndex] = new Set();
        setLetterCubeIndices(updatedLetterCubeIndices);

        // Réinitialiser les positions des cubes utilisés
        const updatedCubePositions = [...cubePositions];
        updatedLetterCubeIndices[letterIndex].forEach((idx) => {
            updatedCubePositions[idx] = initialCubePositions[idx];
        });
        setCubePositions(updatedCubePositions);
    };

    return (
        <div className={styles.banner}>
            <Canvas
                camera={{ position: [0, -5, 15], fov: 50 }} // Inclinaison initiale vers l'arrière
                shadows
                color={"#FFFFFF"}
            >
                {/* Animation de la caméra */}
                <CameraController
                    animationStep={animationStep}
                    targetRotation={0.18}
                    setAnimationStep={setAnimationStep}
                />

                <ambientLight intensity={2} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                <Grid
                    gridData={gridData}
                    hoveredCell={hoveredCell}
                    setHoveredCell={setHoveredCell}
                    onCellClick={handleCubeDrop}
                    animationStep={animationStep}
                />

                <mesh
                    ref={planeRef}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    visible={false} // Rendre le plan invisible
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* Affichage des nouveaux cubes qui remplissent les lettres */}
                {newCubes.map((position, index) => (
                    <mesh
                        key={`new-cube-${index}`}
                        position={position}
                        castShadow
                        visible={animationStep !== "disappear"}
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

                {/* Affichage des cubes à déplacer */}
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

                {/* Affichage du logo avec animation stylée */}
                <LogoDisplay svgUrl={svgUrl} animationStep={animationStep} />
            </Canvas>
        </div>
    );
}
