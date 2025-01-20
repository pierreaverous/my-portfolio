"use client";
import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    ScrollControls,
    useScroll,
    useTexture,
    Edges,
} from "@react-three/drei";
import * as THREE from "three";
import styles from "./CarrouselProject.module.scss";

// Données du carrousel : 9 éléments avec image, titre, description et couleur
const carrouselData = [
    {
        id: 0,
        image: "/SpeedwayGROUPE.jpg",
        title: "Image 1",
        description: "Description de l'image 1",
        color: "#ffbebe",
    },
    {
        id: 1,
        image: "/img2_.jpg",
        title: "Image 2",
        description: "Description de l'image 2",
        color: "#bedfff",
    },
    {
        id: 2,
        image: "/img3_.jpg",
        title: "Image 3",
        description: "Description de l'image 3",
        color: "#d6ffbe",
    },
    {
        id: 3,
        image: "/img4_.jpg",
        title: "Image 4",
        description: "Description de l'image 4",
        color: "#ffd6be",
    },
    {
        id: 4,
        image: "/img5_.jpg",
        title: "Image 5",
        description: "Description de l'image 5",
        color: "#ffbed2",
    },
    {
        id: 5,
        image: "/img6_.jpg",
        title: "Image 6",
        description: "Description de l'image 6",
        color: "#fff7be",
    },
    {
        id: 6,
        image: "/img7_.jpg",
        title: "Image 7",
        description: "Description de l'image 7",
        color: "#c7beff",
    },
    {
        id: 7,
        image: "/img8_.jpg",
        title: "Image 8",
        description: "Description de l'image 8",
        color: "#beffe8",
    },
    {
        id: 8,
        image: "/img9_.jpg",
        title: "Image 9",
        description: "Description de l'image 9",
        color: "#febeff",
    },
];

/**
 * Composant Card3D
 * - Plane 1×1.4, recto/verso
 * - Hover => scale=1.08
 * - Selected => scale=1.2 + y=0.3
 * - Edges colorées si sélectionnée, sinon transparent
 */
function Card3D({ data, onClick, isSelected }) {
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);
    const texture = useTexture(data.image);

    // Ajustement des propriétés de la texture pour une meilleure qualité
    useEffect(() => {
        if (texture) {
            texture.minFilter = THREE.LinearFilter; // Améliore la qualité lors de la réduction
            texture.magFilter = THREE.LinearFilter; // Améliore la qualité lors de l'agrandissement
            texture.anisotropy = 16; // Améliore la qualité à des angles obliques (valeur maximale supportée)
            texture.needsUpdate = true;
            texture.flipY = false; // Désactive l'inversion verticale


        }
    }, [texture]);

    useFrame(() => {
        if (!groupRef.current) return;

        let scaleTarget = 1.0;
        let yTarget = 0.0;

        if (hovered) {
            scaleTarget = 1.08;
        }
        if (isSelected) {
            scaleTarget = 1.2;
            yTarget = 0.3;
        }

        // Interpolation linéaire (lerp) pour l'échelle
        groupRef.current.scale.lerp(
            new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget),
            0.1
        );

        // Interpolation linéaire pour la position Y
        const currentPos = groupRef.current.position.clone();
        const targetPos = new THREE.Vector3(currentPos.x, yTarget, currentPos.z);
        currentPos.lerp(targetPos, 0.1);
        groupRef.current.position.copy(currentPos);
    });

    function handlePointerDown() {
        onClick(data);
    }

    return (
        <group
            ref={groupRef}
            className={styles.Card}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={handlePointerDown}
        >
            <mesh
                rotation={[Math.PI, 9.4, 0]} // **Ajout de la rotation de 180 degrés sur l'axe X**
            >
                <planeGeometry args={[1, 1.4]} />
                <meshBasicMaterial
                    map={texture}
                    side={THREE.DoubleSide} // Rendu à double face
                    toneMapped={false}
                />
                <Edges
                    threshold={5}
                    color={isSelected ? data.color : "transparent"}
                />
            </mesh>
        </group>
);
}

/**
* Composant CarrouselGroup
* - 9 cartes en cercle (index i => angle = i * angleStep)
* - Rotation pilotée par scroll + offset clic
 * - Au clic => la carte i vient devant la caméra
 */
function CarrouselGroup({
                            selectedId,
                            setSelectedId,
                            onSelectColor,
                            onScroll,
                        }) {
    const groupRef = useRef();
    const scroll = useScroll();

    const angleStep = (2 * Math.PI) / carrouselData.length;
    const radius = 3.2;

    // Références pour la rotation courante et l'offset au clic
    const rotationRef = useRef(0);
    const targetRotationRef = useRef(0);

    useFrame(() => {
        if (!groupRef.current) return;

        // Calcul de l'angle de défilement basé sur le scroll
        const scrollAngle = scroll.offset * 2 * Math.PI;
        const targetRotation = scrollAngle + targetRotationRef.current;

        // Interpolation linéaire (lerp) pour une rotation fluide
        rotationRef.current = THREE.MathUtils.lerp(
            rotationRef.current,
            targetRotation,
            0.1
        );

        groupRef.current.rotation.y = rotationRef.current;

        // Appeler la fonction de rappel avec l'offset actuel
        if (onScroll) {
            onScroll(scroll.offset);
        }
    });

    function handleCardClick(item, index) {
        setSelectedId(item.id);
        onSelectColor(item.color);

        const angle = index * angleStep;
        const desiredRotation = -angle;

        let offset = desiredRotation - rotationRef.current;

        // Normalisation de l'offset pour éviter des rotations excessives
        offset = ((offset + Math.PI) % (2 * Math.PI)) - Math.PI;

        // Mise à jour de la rotation cible
        targetRotationRef.current += offset;

        console.log(
            "Clicked card index:",
            index,
            "\n  angle:",
            angle.toFixed(2),
            "\n  desiredRotation:",
            desiredRotation.toFixed(2),
            "\n  currentRotation:",
            rotationRef.current.toFixed(2),
            "\n  offset:",
            offset.toFixed(2),
            "\n  newTargetRotation:",
            targetRotationRef.current.toFixed(2)
        );
    }

    return (
        <group ref={groupRef}>
            {carrouselData.map((item, i) => {
                const angle = i * angleStep;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;

                // Calcul de la rotation pour orienter la carte vers le centre
                const yRot = angle + Math.PI;

                return (
                    <group
                        key={item.id}
                        position={[x, 0, z]}
                        rotation={[0, yRot, 0]}
                    >
                        <Card3D
                            data={item}
                            onClick={(d) => handleCardClick(d, i)}
                            isSelected={selectedId === item.id}
                        />
                    </group>
                );
            })}
        </group>
    );
}

/**
 * Composant CarrouselProject
 * - 60% => Canvas noir avec le carrousel 3D
 * - 40% => Détails de la carte sélectionnée (titre, description) avec fond coloré
 */
export default function CarrouselProject() {
    const [selectedId, setSelectedId] = useState(0);
    const [rightColor, setRightColor] = useState(carrouselData[0].color);
    const [scrollOffset, setScrollOffset] = useState(0);

    const selectedData = carrouselData.find((d) => d.id === selectedId);

    // Fonction pour gérer les clics sur la barre de défilement
    const handleScrollbarClick = (e) => {
        const scrollbar = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - scrollbar.left;
        const newOffset = clickX / scrollbar.width;
        setScrollOffset(newOffset);
        // Note : Contrôler ScrollControls depuis ici nécessite une référence ou une méthode supplémentaire.
        // Cela peut être complexe et nécessite une implémentation avancée.
    };

    return (
        <div className={styles.Container}>
            {/* Côté gauche : Canvas 3D */}
            <div className={styles.LeftSide}>
                <div className={styles.CanvasWrapper}>
                    <Canvas
                        camera={{ position: [0, 0, 8], fov: 45 }}
                        style={{ background: "#000" }}
                        dpr={[1, 2]}
                    >
                        {/* ScrollControls avec 1 page et barres de défilement cachées */}
                        <ScrollControls pages={1} damping={1} hideScrollbars={true}>
                            <CarrouselGroup
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                onSelectColor={(c) => setRightColor(c)}
                                onScroll={(offset) => setScrollOffset(offset)}
                            />
                        </ScrollControls>
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 5, 5]} />
                    </Canvas>
                </div>
                {/* Barre de défilement personnalisée positionnée en dessous du Canvas */}
                <div
                    className={styles.Scrollbar}
                    onClick={handleScrollbarClick} // Gestionnaire de clic
                >
                    <div
                        className={styles.Thumb}
                        style={{
                            transform: `translateX(${scrollOffset * 450}%)`, // 80% = 100% - largeur du pouce (20%)
                        }}
                    />
                </div>
            </div>

            {/* Côté droit : Détails de la carte sélectionnée */}
            <div
                className={styles.RightSide}
                style={{ backgroundColor: rightColor }}
            >
                <h1>{selectedData?.title}</h1>
                <p>{selectedData?.description}</p>
            </div>
        </div>
    );
}
