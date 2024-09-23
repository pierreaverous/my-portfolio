"use client";

import React, {useState, useRef, useEffect} from "react";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useCursor} from "@react-three/drei";
import * as THREE from "three";
import styles from "./banner.module.scss";

// Composant Cell représentant chaque case de la grille
const Cell = React.forwardRef(
    (
        {
            isActive,
            position,
            setHoveredCell,
            isHovered,
            cellSize,
            onClick,
        },
        ref
    ) => {
        useCursor(isHovered);

        return (
            <group>
                <mesh
                    ref={ref}
                    position={position}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                            setHoveredCell(ref.current);
                        }
                    }}
                    onPointerOut={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                            setHoveredCell(null);
                        }
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                            onClick(position); // Appeler la fonction de clic sur la case
                        }
                    }}
                    receiveShadow
                    userData={{ isActiveCell: isActive }}
                >
                    <boxGeometry args={[cellSize, cellSize, 0.5]} />
                    <meshStandardMaterial
                        color={isHovered ? "#007AFF" : isActive ? "#d8d7d7" : "#f5f5f5"}

                    />
                </mesh>

                {/* Ajoutez les bordures légères */}
                <lineSegments position={position}>
                    <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(cellSize, cellSize, 0.5)]} />
                    <lineBasicMaterial attach="material" color="#d3d3d3" linewidth={0.5} /> {/* Couleur et épaisseur de la bordure */}
                </lineSegments>
            </group>
        );
    }
);


// Composant Grid pour afficher la grille avec les lettres "NEXT"
const Grid = React.forwardRef(
    (
        {gridData, setHoveredCell, hoveredCell, cellSize, onCellClick},
        ref
    ) => {
        const rows = gridData.length;
        const cols = gridData[0].length;

        return (
            <group ref={ref}>
                {gridData.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        const isActive = cell === 1;
                        const position = [
                            (colIndex - cols / 2 + 0.5) * cellSize,
                            (rows / 2 - rowIndex - 0.5) * cellSize,
                            0,
                        ];

                        const isHovered =
                            hoveredCell &&
                            hoveredCell.position.x === position[0] &&
                            hoveredCell.position.y === position[1];

                        const cellRef = useRef();

                        return (
                            <Cell
                                key={`${rowIndex}-${colIndex}`}
                                ref={cellRef}
                                isActive={isActive}
                                position={position}
                                isHovered={isHovered}
                                setHoveredCell={setHoveredCell}
                                cellSize={cellSize}
                                onClick={onCellClick} // Ajouté pour gérer le clic
                            />
                        );
                    })
                )}
            </group>
        );
    }
);

// Composant DraggableCube pour gérer le cube à déplacer
// Composant DraggableCube pour gérer le cube à déplacer
function DraggableCube({
                           position,
                           setPosition,
                           targetPosition,
                           planeRef,
                           onCubeClick,
                       }) {
    const meshRef = useRef();
    const {raycaster, mouse, camera} = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isDropping, setIsDropping] = useState(false);
    useCursor(isDragging);

    useFrame(() => {
        if (isDragging && meshRef.current && planeRef.current) {
            // Le cube suit le curseur tant que le clic de la souris est maintenu
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(planeRef.current);

            if (intersects.length > 0) {
                const intersect = intersects[0];

                // Centrer le cube sous le curseur en utilisant cellSize
                const snappedX = Math.round(intersect.point.x);
                const snappedY = Math.round(intersect.point.y);

                // Déplacer le cube à la position ajustée et centré
                meshRef.current.position.set(snappedX, snappedY, 1.2); // Hauteur pendant le drag
            }
        } else if (isDropping && meshRef.current && targetPosition) {
            // Animation de la chute du cube
            if (meshRef.current.position.z > targetPosition[2]) {
                meshRef.current.position.z -= 0.2; // Ajustez la vitesse de chute
                if (meshRef.current.position.z <= targetPosition[2]) {
                    meshRef.current.position.z = targetPosition[2];
                    setIsDropping(false);
                }
            }
        }
    });

    useEffect(() => {
        if (targetPosition) {
            setPosition([targetPosition[0], targetPosition[1], 1]); // Positionner le cube au-dessus de la case cible
            setIsDropping(true); // Activer la chute
        }
    }, [targetPosition, setPosition]);

    return (
        <mesh
            ref={meshRef}
            position={position}
            onPointerDown={(e) => {
                e.stopPropagation();
                setIsDragging(true); // Commence à déplacer le cube au clic
                if (onCubeClick) onCubeClick(); // Simuler l'action de clic sur le cube
            }}
            onPointerUp={(e) => {
                e.stopPropagation();
                setIsDragging(false); // Arrête de déplacer le cube lorsque le clic de la souris est relâché
                setIsDropping(true); // Active la chute du cube lorsque la souris est relâchée
            }}
            scale={isDragging ? [1.1, 1.1, 1.1] : [1, 1, 1]}
            castShadow
        >
            <boxGeometry args={[1, 1, 1]}/>
            <meshStandardMaterial
                color="#0400ff"
                opacity={0.7}  // Transparence pour l'effet de glaçon
                transparent={true}
                roughness={0.7}
                metalness={0.5}
                envMapIntensity={10}
            />
            05167EFF

        </mesh>
    );
}


// Composant principal Banner
export default function Banner() {
    const cellSize = 1;

    const letterN = [
        [1, 0, 0, 0, 1],
        [1, 1, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 1, 1],
        [1, 0, 0, 0, 1],
    ];

    const letterE = [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
    ];

    const letterX = [
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
    ];

    const letterT = [
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];

    const gridData = [];
    for (let i = 0; i < 5; i++) {
        gridData.push([
            ...letterN[i],
            0,
            ...letterE[i],
            0,
            ...letterX[i],
            0,
            ...letterT[i],
        ]);
    }

    const [cubePosition, setCubePosition] = useState([0, -6, 0.5]);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [targetPosition, setTargetPosition] = useState(null);

    const planeRef = useRef();

    const handleCellClick = (position) => {
        // Vous pouvez décider d'autres actions à réaliser lors d'un clic sur la case.
        setTargetPosition([position[0], position[1], 0.5]); // Définir la position cible de la case cliquée
    };

    return (
        <div className={styles.banner}>
            <Canvas
                camera={{position: [0, -5, 15], fov: 50}}
                shadows
                style={{backgroundColor: "#000000"}} // Arrière-plan blanc cassé
            >
                <ambientLight intensity={2}/>
                {/* Ajusté pour donner plus de luminosité */}
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                <Grid
                    gridData={gridData}
                    setHoveredCell={setHoveredCell}
                    hoveredCell={hoveredCell}
                    cellSize={cellSize}
                    onCellClick={handleCellClick}
                    ref={planeRef}
                />

                <mesh ref={planeRef} position={[0, 0, 0]} rotation={[0, 0, 0]} visible={true}>
                    <planeGeometry args={[100, 100]}/>
                    <meshBasicMaterial transparent opacity={1}/>
                </mesh>

                <DraggableCube
                    position={cubePosition}
                    setPosition={setCubePosition}
                    targetPosition={targetPosition}
                    planeRef={planeRef}
                />
            </Canvas>
        </div>
    );
}