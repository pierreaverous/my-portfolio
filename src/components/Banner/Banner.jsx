"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import styles from "./banner.module.scss";
import {
    EffectComposer,
    Outline,
    Bloom,
    DepthOfField,
    Glitch,
} from "@react-three/postprocessing"; // Import post-processing

// -----------------------------
// **Utility Functions**
// -----------------------------

// Fonction pour obtenir les positions des cubes à partir d'une grille de lettre
const getLetterPositions = (letterGrid, baseX, baseY) => {
    const positions = [];
    const rows = letterGrid.length;
    const cols = letterGrid[0].length;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (letterGrid[row][col] === 1) {
                positions.push([baseX + col, baseY - row, 0.5]); // Position en Z
            }
        }
    }
    return positions;
};

// Fonction pour générer les données de la grille et les colonnes de départ pour les lettres
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

// -----------------------------
// **Cell Component**
// -----------------------------

// Représente chaque cellule de la grille
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
                    visible={animationStep !== "logo"} // Cacher les cellules uniquement lors de l'étape 'logo'
                >
                    <boxGeometry args={[1, 1, 0.5]} />
                    <meshStandardMaterial
                        color={
                            isHovered ? "#007AFF" : isActive ? "#d8d7d7" : "#f5f5f5"
                        }
                    />
                </mesh>
                <lineSegments position={position} visible={animationStep !== "logo"}>
                    <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1, 0.5)]} />
                    <lineBasicMaterial attach="material" color="#d3d3d3" linewidth={0.5} />
                </lineSegments>
            </group>
        );
    }
);

// -----------------------------
// **Grid Component**
// -----------------------------

// Affiche la grille avec les lettres
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

// -----------------------------
// **DraggableCube Component**
// -----------------------------

// Gère les cubes initiaux que les utilisateurs peuvent déplacer
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

    useCursor(isDragging);

    useFrame(() => {
        if (animationStep !== "filling") return; // Permettre le glissement uniquement pendant l'étape 'filling'

        if (isDragging && meshRef.current && planeRef.current) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(planeRef.current);

            if (intersects.length > 0) {
                const intersect = intersects[0];

                const snappedX = Math.round(intersect.point.x);
                const snappedY = Math.round(intersect.point.y);

                meshRef.current.position.set(snappedX, snappedY, 1.2); // Hauteur pendant le glissement
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
            visible={animationStep !== "logo"} // Visible jusqu'à l'étape 'logo'
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

// -----------------------------
// **ExplodingCube Component**
// -----------------------------

// Gère l'animation d'explosion des cubes formant les lettres
const ExplodingCube = ({ position, cubeIndex, onExplosionComplete }) => {
    const meshRef = useRef();
    const [isExploding, setIsExploding] = useState(false);
    const [explosionVelocity, setExplosionVelocity] = useState(new THREE.Vector3());
    const [rotationSpeed, setRotationSpeed] = useState(new THREE.Vector3());

    useEffect(() => {
        console.log(`ExplodingCube ${cubeIndex} mounted.`);
        // Démarrer l'explosion dès que le composant est monté
        setIsExploding(true);

        // Définir une vélocité aléatoire pour l'explosion
        const randomDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        ).normalize().multiplyScalar(2);

        setExplosionVelocity(randomDirection);

        // Définir une rotation aléatoire
        const randomRotation = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );

        setRotationSpeed(randomRotation);

        // Durée de l'animation d'explosion
        const explosionDuration = 2000; // 2 secondes

        // Notifier la fin de l'explosion après la durée spécifiée
        const timeout = setTimeout(() => {
            console.log(`Explosion du cube ${cubeIndex} terminée.`);
            onExplosionComplete(cubeIndex);
        }, explosionDuration);

        return () => clearTimeout(timeout);
    }, [cubeIndex, onExplosionComplete]);

    useFrame(() => {
        if (isExploding && meshRef.current) {
            // Mouvement d'explosion avec amortissement
            const dampingFactor = 0.95;
            explosionVelocity.multiplyScalar(dampingFactor);
            meshRef.current.position.add(explosionVelocity);

            // Rotation continue
            meshRef.current.rotation.x += rotationSpeed.x;
            meshRef.current.rotation.y += rotationSpeed.y;
            meshRef.current.rotation.z += rotationSpeed.z;

            // Réduction de l'opacité et augmentation de l'échelle
            meshRef.current.material.opacity = THREE.MathUtils.lerp(
                meshRef.current.material.opacity,
                0,
                0.02
            );
            meshRef.current.scale.lerp(
                meshRef.current.scale.clone().add(new THREE.Vector3(0.05, 0.05, 0.05)),
                0.02
            );

            // Cacher le cube lorsque l'opacité est faible
            if (meshRef.current.material.opacity <= 0.01) {
                meshRef.current.visible = false;
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            castShadow
            visible={true} // Toujours visible pendant l'explosion
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color="#0907B5" // Couleur de l'explosion, ajustez selon vos préférences
                opacity={0.7}
                transparent={true}
                roughness={0.7}
                metalness={0.5}
                envMapIntensity={10}
            />
        </mesh>
    );
};

// -----------------------------
// **ExplodingCell Component**
// -----------------------------

// Gère l'animation d'explosion des cellules de la grille
const ExplodingCell = ({ position, cellIndex, onExplosionComplete }) => {
    const meshRef = useRef();
    const [isExploding, setIsExploding] = useState(false);
    const [explosionVelocity, setExplosionVelocity] = useState(new THREE.Vector3());
    const [rotationSpeed, setRotationSpeed] = useState(new THREE.Vector3());

    useEffect(() => {
        console.log(`ExplodingCell ${cellIndex} mounted.`);
        // Démarrer l'explosion dès que le composant est monté
        setIsExploding(true);

        // Définir une vélocité aléatoire pour l'explosion
        const randomDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        ).normalize().multiplyScalar(2);

        setExplosionVelocity(randomDirection);

        // Définir une rotation aléatoire
        const randomRotation = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );

        setRotationSpeed(randomRotation);

        // Durée de l'animation d'explosion
        const explosionDuration = 2000; // 2 secondes

        // Notifier la fin de l'explosion après la durée spécifiée
        const timeout = setTimeout(() => {
            console.log(`Explosion de la cellule ${cellIndex} terminée.`);
            onExplosionComplete(cellIndex);
        }, explosionDuration);

        return () => clearTimeout(timeout);
    }, [cellIndex, onExplosionComplete]);

    useFrame(() => {
        if (isExploding && meshRef.current) {
            // Mouvement d'explosion avec amortissement
            const dampingFactor = 0.95;
            explosionVelocity.multiplyScalar(dampingFactor);
            meshRef.current.position.add(explosionVelocity);

            // Rotation continue
            meshRef.current.rotation.x += rotationSpeed.x;
            meshRef.current.rotation.y += rotationSpeed.y;
            meshRef.current.rotation.z += rotationSpeed.z;

            // Réduction de l'opacité et augmentation de l'échelle
            meshRef.current.material.opacity = THREE.MathUtils.lerp(
                meshRef.current.material.opacity,
                0,
                0.02
            );
            meshRef.current.scale.lerp(
                meshRef.current.scale.clone().add(new THREE.Vector3(0.05, 0.05, 0.05)),
                0.02
            );

            // Cacher le cube lorsque l'opacité est faible
            if (meshRef.current.material.opacity <= 0.01) {
                meshRef.current.visible = false;
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            castShadow
            visible={true} // Toujours visible pendant l'explosion
        >
            <boxGeometry args={[1, 1, 0.5]} />
            <meshStandardMaterial
                color="#0907B5" // Couleur de l'explosion de la cellule, ajustez selon vos préférences
                opacity={0.7}
                transparent={true}
                roughness={0.7}
                metalness={0.5}
                envMapIntensity={10}
            />
        </mesh>
    );
};

// -----------------------------
// **ExplodingGrid Component**
// -----------------------------

// Composant pour gérer l'explosion des cellules de la grille
const ExplodingGrid = ({ gridData, onExplosionComplete }) => {
    // Extraire les positions des cellules actives et les mémoïser
    const uniqueCellPositions = useMemo(() => {
        const positions = [];
        gridData.forEach((row, rowIdx) => {
            row.forEach((cell, colIdx) => {
                if (cell === 1) {
                    positions.push([
                        colIdx - Math.floor(gridData[0].length / 2),
                        Math.floor(gridData.length / 2) - rowIdx,
                        0,
                    ]);
                }
            });
        });
        return positions;
    }, [gridData]);

    return (
        <group>
            {uniqueCellPositions.map((position, index) => (
                <ExplodingCell
                    key={`exploding-cell-${index}`}
                    position={position}
                    cellIndex={index}
                    onExplosionComplete={onExplosionComplete}
                />
            ))}
        </group>
    );
};

// -----------------------------
// **LogoMeshes Component**
// -----------------------------

// Charge et crée les maillages du logo à partir d'un fichier SVG
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
                    });

                    paths.forEach((path, pathIndex) => {
                        const shapes = path.toShapes(true);
                        shapes.forEach((shape, shapeIndex) => {
                            const geometry = new THREE.ExtrudeGeometry(shape, {
                                depth: 10, // Profondeur minimale pour le 3D
                                bevelEnabled: false,
                            });
                            const mesh = new THREE.Mesh(geometry, material);
                            groupRef.current.add(mesh);
                            console.log(`Mesh added: Path ${pathIndex}, Shape ${shapeIndex}`);
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

// -----------------------------
// **LogoDisplay Component**
// -----------------------------

// Affiche le logo avec des effets de post-traitement
const LogoDisplay = ({ svgUrl, animationStep, rotation }) => {
    const groupRef = useRef();
    const [meshesLoaded, setMeshesLoaded] = useState(false);
    const [scale, setScale] = useState(0.01); // Commence avec une petite échelle

    useEffect(() => {
        if (animationStep === "logo") {
            console.log("Logo animation step activated.");
        }
    }, [animationStep]);

    // Graduellement augmenter l'échelle du logo pendant l'étape 'logo'
    useFrame(() => {
        if (animationStep === "logo" && meshesLoaded && groupRef.current) {
            const targetScale = 0.05; // Ajustez l'échelle cible selon vos besoins
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
                rotation={rotation} // Appliquer la rotation
                visible={animationStep === "logo"}
            >
                {/* Ajouter les maillages SVG au groupe */}
                {animationStep === "logo" && (
                    <LogoMeshes
                        svgUrl={svgUrl}
                        groupRef={groupRef}
                        setMeshesLoaded={setMeshesLoaded}
                    />
                )}
            </group>

            {/* Appliquer les effets de post-traitement */}
            {animationStep === "logo" && (
                <EffectComposer>
                    {/* Effet Bloom */}
                    <Bloom
                        luminanceThreshold={0.1} // Ajustez le seuil pour les parties lumineuses
                        luminanceSmoothing={0.9}
                        intensity={1.5} // Intensité de l'effet Bloom
                    />
                    {/* Effet Outline pour le glow */}
                    <Outline
                        blur
                        edgeStrength={3} // Ajustez pour un glow plus fort
                        pulseSpeed={0.6}
                        visibleEdgeColor="#ffffff"
                        hiddenEdgeColor="#000000"
                        width={1024}
                        height={1024}
                    />
                    {/* Effet Depth of Field (Flou) */}

                    {/* Effet Glitch (optionnel) */}
                    {/* <Glitch
                        delay={[2.5, 5.5]} // Temps entre les glitchs
                        duration={[0.3, 1.0]} // Durée de chaque glitch
                        strength={[0.1, 0.3]} // Intensité de l'effet glitch
                    /> */}
                </EffectComposer>
            )}
        </>
    );
};

// -----------------------------
// **CameraController Component**
// -----------------------------

// Gère l'animation de la caméra
const CameraController = ({ setAnimationStep }) => {
    const { camera } = useThree();
    const [completed, setCompleted] = useState(false);
    const targetPosition = new THREE.Vector3(0, -5, 15);
    const targetRotation = new THREE.Euler(0.18, 0, 0); // Ajustez selon vos besoins

    useFrame(() => {
        if (!completed) {
            // Interpoler doucement la position de la caméra
            camera.position.lerp(targetPosition, 0.02);
            // Interpoler doucement la rotation de la caméra
            camera.rotation.x = THREE.MathUtils.lerp(
                camera.rotation.x,
                targetRotation.x,
                0.02
            );

            // Vérifier si la caméra a atteint la position et rotation cible
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

// -----------------------------
// **Main Banner Component**
// -----------------------------

export default function Banner() {
    const svgUrl = "/WEB.svg"; // Assurez-vous que ce chemin est correct et accessible

    // Définir vos lettres
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

    // Mémoïser les données de la grille pour éviter les re-rendus inutiles
    const { gridData, letterStartCols } = useMemo(() => generateGridData(letters), [letters]);

    // Positions initiales des cubes que les utilisateurs peuvent déplacer
    const initialCubePositions = [
        [0, -6, 0.5],
        [2, -6, 0.5],
        [-2, -6, 0.5],
        [4, -6, 0.5],
        [-4, -6, 0.5],
        [6, -6, 0.5],
    ];

    // Variables d'état
    const [hoveredCell, setHoveredCell] = useState(null);
    const [filledLetters, setFilledLetters] = useState(new Array(letters.length).fill(false));
    const [letterCubeIndices, setLetterCubeIndices] = useState(
        new Array(letters.length).fill().map(() => new Set())
    );
    const [newCubes, setNewCubes] = useState([]); // Cubes formant les lettres
    const [cubePositions, setCubePositions] = useState(initialCubePositions);

    const [animationStep, setAnimationStep] = useState("filling"); // Étapes: 'filling', 'camera', 'disappear', 'logo'
    const [explodedCubes, setExplodedCubes] = useState(new Set());
    const [explodedCells, setExplodedCells] = useState(new Set());

    // Indicateur pour s'assurer que l'étape 'disappear' est lancée une seule fois
    const [hasDisappeared, setHasDisappeared] = useState(false);

    // Refs pour stocker les totaux à exploser une seule fois
    const totalCubesToExplodeRef = useRef(0);
    const totalCellsToExplodeRef = useRef(0);

    const planeRef = useRef();

    // Utiliser useCallback pour stabiliser les callbacks
    const handleExplosionCompleteCube = useCallback((cubeIndex) => {
        console.log(`Explosion du cube ${cubeIndex} enregistrée.`);
        setExplodedCubes((prev) => new Set(prev).add(cubeIndex));
    }, []);

    const handleExplosionCompleteCell = useCallback((cellIndex) => {
        console.log(`Explosion de la cellule ${cellIndex} enregistrée.`);
        setExplodedCells((prev) => new Set(prev).add(cellIndex));
    }, []);

    // Vérifier si toutes les lettres sont remplies pour passer à l'étape 'camera'
    useEffect(() => {
        if (filledLetters.every(Boolean) && animationStep === "filling") {
            console.log("All letters filled. Transitioning to 'camera' step.");
            setAnimationStep("camera");
        }
    }, [filledLetters, animationStep]);

    // Gérer l'étape 'disappear' une seule fois et capturer les totaux
    useEffect(() => {
        if (animationStep === "disappear" && !hasDisappeared) {
            console.log("Starting disappearance animation.");
            setHasDisappeared(true); // Marquer que l'étape 'disappear' a été lancée

            // Capturer le total des cubes et des cellules à exploser
            totalCubesToExplodeRef.current = newCubes.length;
            const activeCells = gridData.flat().reduce((acc, cell) => acc + (cell === 1 ? 1 : 0), 0);
            totalCellsToExplodeRef.current = activeCells;

            console.log(`Total cubes to explode: ${totalCubesToExplodeRef.current}`);
            console.log(`Total cells to explode: ${totalCellsToExplodeRef.current}`);

            // Réinitialiser les trackers des explosions
            setExplodedCubes(new Set());
            setExplodedCells(new Set());
        }
    }, [animationStep, hasDisappeared, newCubes.length, gridData]);

    // Gérer la transition vers 'logo' une fois toutes les explosions terminées
    useEffect(() => {
        if (animationStep === "disappear") {
            const totalCubesToExplode = totalCubesToExplodeRef.current;
            const totalCellsToExplode = totalCellsToExplodeRef.current;

            console.log(
                `Checking explosions: ${explodedCubes.size}/${totalCubesToExplode} cubes, ` +
                `${explodedCells.size}/${totalCellsToExplode} cells.`
            );

            if (
                explodedCubes.size === totalCubesToExplode &&
                explodedCells.size === totalCellsToExplode
            ) {
                console.log("All cubes and cells have exploded. Transitioning to 'logo' step.");
                setAnimationStep("logo");
            }
        }
    }, [explodedCubes, explodedCells, animationStep]);

    // Gérer le dépôt d'un cube sur la grille
    const handleCubeDrop = useCallback((position, cubeIndex) => {
        if (animationStep !== "filling") return; // Empêcher le dépôt pendant les autres animations

        // Déterminer quelle lettre le cube a été déposé en fonction de la position X
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
            // Vérifier si le cube fait partie des cubes initiaux
            if (cubeIndex < initialCubePositions.length) {
                const updatedLetterCubeIndices = [...letterCubeIndices];
                updatedLetterCubeIndices[letterIndex].add(cubeIndex);
                setLetterCubeIndices(updatedLetterCubeIndices);

                // Si au moins deux cubes sont placés sur la lettre, remplir la lettre
                if (
                    updatedLetterCubeIndices[letterIndex].size >= 2 &&
                    !filledLetters[letterIndex]
                ) {
                    fillLetter(letterIndex);
                }
            }
        }
    }, [animationStep, letters, gridData, letterCubeIndices, filledLetters]);

    // Fonction pour remplir la lettre avec des cubes
    const fillLetter = useCallback((letterIndex) => {
        const baseX =
            letterStartCols[letterIndex] - Math.floor(gridData[0].length / 2);
        const baseY = Math.floor(gridData.length / 2);

        const allPositions = getLetterPositions(
            letters[letterIndex],
            baseX,
            baseY
        );

        // Trier les positions pour un effet de chute
        allPositions.sort((a, b) => b[1] - a[1]);

        // Ajouter des cubes avec un délai pour un effet d'échelonnement
        allPositions.forEach((pos, idx) => {
            setTimeout(() => {
                // Empêcher l'ajout de nouveaux cubes si l'étape n'est pas 'filling'
                if (animationStep === "filling") {
                    setNewCubes((prev) => [...prev, pos]);
                }
            }, idx * 50); // Délai de 50ms entre chaque cube
        });

        // Mettre à jour l'état des lettres remplies
        const updatedFilledLetters = [...filledLetters];
        updatedFilledLetters[letterIndex] = true;
        setFilledLetters(updatedFilledLetters);

        // Réinitialiser les indices des cubes placés sur la lettre
        const updatedLetterCubeIndices = [...letterCubeIndices];
        updatedLetterCubeIndices[letterIndex] = new Set();
        setLetterCubeIndices(updatedLetterCubeIndices);

        // Réinitialiser les positions des cubes utilisés aux positions initiales
        const updatedCubePositions = [...cubePositions];
        updatedLetterCubeIndices[letterIndex].forEach((idx) => {
            updatedCubePositions[idx] = initialCubePositions[idx];
        });
        setCubePositions(updatedCubePositions);
    }, [animationStep, filledLetters, gridData.length, gridData[0].length, letterStartCols, letterCubeIndices, letters, initialCubePositions, setNewCubes, setFilledLetters, setLetterCubeIndices, setCubePositions]);

    // -----------------------------
    // **Main Banner JSX**
    // -----------------------------

    return (
        <div className={styles.banner}>
            <Canvas
                camera={{ position: [0, -5, 15], fov: 50 }} // Position initiale de la caméra
                shadows
                color={"#FFFFFF"}
            >
                {/* Lumières ambiantes et directionnelles */}
                <ambientLight intensity={2} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                {/* Rendre CameraController uniquement pendant l'étape 'camera' */}
                {animationStep === "camera" && (
                    <CameraController setAnimationStep={setAnimationStep} />
                )}

                {/* Rendre Grid, nouveaux cubes et DraggableCubes pendant les étapes pertinentes */}
                {(animationStep === "filling" ||
                    animationStep === "camera" ||
                    animationStep === "disappear") && (
                    <>
                        {animationStep !== "disappear" ? (
                            // Pendant 'filling' et 'camera', rendre la grille normalement
                            <Grid
                                gridData={gridData}
                                hoveredCell={hoveredCell}
                                setHoveredCell={setHoveredCell}
                                onCellClick={handleCubeDrop}
                                animationStep={animationStep}
                            />
                        ) : (
                            // Pendant 'disappear', rendre les cellules en tant qu'ExplodingGrid
                            <ExplodingGrid
                                gridData={gridData}
                                onExplosionComplete={handleExplosionCompleteCell}
                            />
                        )}
                        {/* Rendre les cubes formant les lettres */}
                        {animationStep === "disappear"
                            ? newCubes.map((position, index) => (
                                <ExplodingCube
                                    key={`exploding-cube-${index}`}
                                    position={position}
                                    cubeIndex={index}
                                    onExplosionComplete={handleExplosionCompleteCube}
                                />
                            ))
                            : newCubes.map((position, index) => (
                                <mesh
                                    key={`new-cube-${index}`}
                                    position={position}
                                    castShadow
                                    visible={animationStep !== "logo"} // Cacher pendant l'étape 'logo'
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
                        {/* Rendre les cubes initiaux pendant l'étape 'filling' */}
                        {animationStep === "filling" &&
                            cubePositions.map((position, index) => (
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

                {/* Plan invisible pour le glissement */}
                <mesh
                    ref={planeRef}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    visible={false} // Rendre le plan invisible
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* Rendre LogoDisplay uniquement pendant l'étape 'logo' */}
                {animationStep === "logo" && (
                    <>
                        <LogoDisplay
                            svgUrl={svgUrl}
                            animationStep={animationStep}
                            rotation={[Math.PI, 0, 0]} // Rotation de 180 degrés sur l'axe X
                        />
                        <OrbitControls />
                    </>
                )}
            </Canvas>
        </div>)
}

