"use client";

import React, { useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import styles from "./banner.module.scss";

// Fonction utilitaire pour obtenir les positions des cubes à partir de la matrice d'une lettre
const getLetterPositions = (letterGrid, baseX, baseY) => {
    const positions = [];
    const rows = letterGrid.length;
    const cols = letterGrid[0].length;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (letterGrid[row][col] === 1) {
                positions.push([
                    baseX + col,
                    baseY - row,
                    0.5, // z-position
                ]);
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
const Cell = React.forwardRef(({ position, isActive, isHovered, onClick }, ref) => {
    useCursor(isHovered);
    return (
        <group>
            <mesh
                ref={ref}
                position={position}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    if (isActive) onClick(position, true);
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    if (isActive) onClick(position, false);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) onClick(position);
                }}
                receiveShadow
            >
                <boxGeometry args={[1, 1, 0.5]} />
                <meshStandardMaterial color={isHovered ? "#007AFF" : isActive ? "#d8d7d7" : "#f5f5f5"} />
            </mesh>
            <lineSegments position={position}>
                <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1, 0.5)]} />
                <lineBasicMaterial attach="material" color="#d3d3d3" linewidth={0.5} />
            </lineSegments>
        </group>
    );
});

// Composant Grid pour afficher la grille avec les lettres
const Grid = ({ gridData, hoveredCell, setHoveredCell, onCellClick }) => {
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
                        ? hoveredCell[0] === position[0] && hoveredCell[1] === position[1]
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
                        />
                    );
                })
            )}
        </group>
    );
};

// Composant DraggableCube pour gérer le cube à déplacer
const DraggableCube = ({ position, cubeIndex, onDrop, planeRef }) => {
    const meshRef = useRef();
    const { raycaster, mouse, camera } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isDropping, setIsDropping] = useState(false);
    useCursor(isDragging);

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
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onPointerDown={(e) => {
                e.stopPropagation();
                setIsDragging(true);
            }}
            onPointerUp={(e) => {
                e.stopPropagation();
                setIsDragging(false);
                setIsDropping(true);
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

// Composant principal Banner
export default function Banner() {
    const cellSize = 1;

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
    const [filledLetters, setFilledLetters] = useState(new Array(letters.length).fill(false));
    const [letterCubeIndices, setLetterCubeIndices] = useState(
        new Array(letters.length).fill().map(() => new Set())
    );
    const [newCubes, setNewCubes] = useState([]);
    const [cubePositions, setCubePositions] = useState(initialCubePositions);

    const planeRef = useRef();

    // Gestion du dépôt d'un cube sur la grille
    const handleCubeDrop = (position, cubeIndex) => {
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
            cumulativeOffset += letterWidth + 1;
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
        const baseX = letterStartCols[letterIndex] - Math.floor(gridData[0].length / 2);
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
            }, idx * 100); // Délai de 100ms entre chaque cube
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
            <Canvas camera={{ position: [0, -5, 15], fov: 50 }} shadows>
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
                    onCellClick={() => {}}
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
                    <mesh key={`new-cube-${index}`} position={position} castShadow>
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
                    />
                ))}
            </Canvas>
        </div>
    );
}
