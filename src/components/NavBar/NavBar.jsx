"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import styles from "./navbar.module.scss";
import {OrbitControls} from "@react-three/drei";

/*
  ─────────────────────────────────────────────────────────────────
  Cache Global pour le SVG
  ─────────────────────────────────────────────────────────────────
*/
const svgCache = {};

/*
  ─────────────────────────────────────────────────────────────────
  1) Composant StarMeshes
     - Charge le fichier /public/logo.svg (ou star.svg)
     - Centre et rescale le modèle pour qu'il soit visible
     - Transmet la largeur du SVG au parent via onLoaded
     - Utilise un "cache" pour éviter de recharger le SVG à chaque fois
  ─────────────────────────────────────────────────────────────────
*/
const StarMeshes = ({ starUrl, groupRef, onLoaded }) => {
    useEffect(() => {
        if (!groupRef.current) return;

        // 1. Si on a déjà chargé ce SVG, on l'utilise directement
        if (svgCache[starUrl]) {
            const { group, width } = svgCache[starUrl];
            // Cloner pour éviter des modifications sur l'original
            const cloneGroup = group.clone(true);
            groupRef.current.add(cloneGroup);
            onLoaded(true, width);
            return;
        }

        // 2. Sinon, on fait la requête au SVG (une seule fois)
        const loader = new SVGLoader();
        loader.load(
            starUrl,
            (data) => {
                const paths = data.paths;
                const colors = [
                    "#0139ff",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#0139ff",
                    "#1d1d1b",
                    "#0139ff",

                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                    "#1d1d1b",
                ];

                const tempGroup = new THREE.Group();

                paths.forEach((path, idx) => {
                    const color = colors[idx % colors.length];
                    const material = new THREE.MeshStandardMaterial({
                        color,
                        side: THREE.DoubleSide,
                        metalness: 0.3,
                        roughness: 0.4,
                    });

                    const shapes = path.toShapes(true);
                    shapes.forEach((shape) => {
                        const geometry = new THREE.ExtrudeGeometry(shape, {
                            depth: 3,
                            bevelEnabled: true,
                            bevelThickness: 0.3,
                            bevelSize: 0.3,
                            bevelSegments: 1,
                            steps: 1,
                        });
                        const mesh = new THREE.Mesh(geometry, material);
                        // Inversion Y (SVG vs. Three.js)
                        mesh.scale.y *= -1;
                        tempGroup.add(mesh);
                    });
                });

                // Centrer le modèle (bounding box)
                const box = new THREE.Box3().setFromObject(tempGroup);
                const center = box.getCenter(new THREE.Vector3());
                tempGroup.children.forEach((child) => {
                    child.position.x -= center.x;
                    child.position.y -= center.y;
                    child.position.z -= center.z;
                });

                // Rescale
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const desiredSize = 1.2;
                const scaleFactor = desiredSize / maxDim;
                tempGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // On calcule la largeur extrudée du SVG
                const svgWidth = size.x * scaleFactor;

                // On stocke dans le cache
                svgCache[starUrl] = {
                    group: tempGroup,
                    width: svgWidth,
                };

                // On clone pour la scène
                const cloneGroup = tempGroup.clone(true);
                groupRef.current.add(cloneGroup);

                // Transmettre la largeur au parent
                onLoaded(true, svgWidth);
            },
            undefined,
            (error) => {
                console.error("Error loading star SVG:", error);
            }
        );
    }, [starUrl, groupRef, onLoaded]);

    return null;
};

/*
  ─────────────────────────────────────────────────────────────────
  2) Composant Particle
     - Représente une particule se déplaçant / s'estompant
  ─────────────────────────────────────────────────────────────────
*/
const Particle = ({ particle, onUpdate }) => {
    const ref = useRef();
    const [age, setAge] = useState(0);

    useFrame((_, delta) => {
        if (!ref.current) return;

        const { velocity, lifetime } = particle;

        // Déplacement
        ref.current.position.addScaledVector(velocity, delta);

        // Vieillissement
        setAge((prev) => prev + delta);
        const ratio = age / lifetime;

        // Fading
        ref.current.material.opacity = Math.max(1 - ratio, 0);

        // Callback
        onUpdate(ref.current.position, age);
    });

    return (
        <mesh ref={ref} position={particle.position.clone()}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color={particle.color} transparent opacity={1} />
        </mesh>
    );
};

/*
  ─────────────────────────────────────────────────────────────────
  3) Composant ParticleSystem
     - Gère la liste (tableau) des particules
  ─────────────────────────────────────────────────────────────────
*/
const ParticleSystem = ({ particles, setParticles }) => {
    return (
        <>
            {particles.map((p) => (
                <Particle
                    key={p.id}
                    particle={p}
                    onUpdate={(pos, age) => {
                        // Supprimer la particule si trop vieille ou hors zone
                        if (age > p.lifetime || pos.x < -20 || pos.x > 20) {
                            setParticles((old) => old.filter((item) => item.id !== p.id));
                        }
                    }}
                />
            ))}
        </>
    );
};

/*
  ─────────────────────────────────────────────────────────────────
  4) Composant MovingStar
     - Fait bouger le logo de gauche à droite
     - Émet des particules régulièrement
     - Révèle les textes quand la "fin" du SVG dépasse leur x
  ─────────────────────────────────────────────────────────────────
*/
const MovingStar = ({ starUrl, onReveal }) => {
    const groupRef = useRef();
    const [isLoaded, setIsLoaded] = useState(false);

    // Largeur du SVG extrudé
    const [starWidth, setStarWidth] = useState(0);

    // Particules
    const [particles, setParticles] = useState([]);

    // Vitesse de déplacement
    const speed = 3;

    // Positions X pour révéler les textes
    const textPositions = useMemo(
        () => ({
            accueil: 0,
            project: 0,
            contact: 1,
        }),
        []
    );

    // Init : position de départ
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.position.x = -8;
        }
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Déplacement
        groupRef.current.position.x += speed * delta;

        // Borne droite : x=6.6
        if (groupRef.current.position.x >= 6.6) {
            groupRef.current.position.x = 6.6;
            return;
        } else {
            // Émission de particules ~ 60 fois/seconde
            const emissionRate = 60;
            const time = state.clock.getElapsedTime();

            if (Math.floor(time * emissionRate) !== Math.floor((time - delta) * emissionRate)) {
                for (let i = 0; i < 100; i++) {
                    const color = Math.random() > 0.5 ? "#0139ff" : "#1d1d1b";
                    const randomOffsetX = (Math.random() - 0.5) * 0.5;
                    const randomOffsetY = (Math.random() - 0.5) * 0.5;

                    const spawnPos = groupRef.current.position.clone();
                    spawnPos.x += randomOffsetX;
                    spawnPos.y += randomOffsetY;

                    const velocity = new THREE.Vector3(
                        -((Math.random() * 0.3) + 0.2),
                        (Math.random() - 0.5) * 0.2,
                        0
                    );

                    setParticles((old) => [
                        ...old,
                        {
                            id: crypto.randomUUID(),
                            position: spawnPos,
                            velocity,
                            color,
                            lifetime: 0.8,
                        },
                    ]);
                }
            }
        }

        // Révélation des textes
        if (starWidth > 0) {
            Object.entries(textPositions).forEach(([key, xValue]) => {
                // Si la "fin" du SVG (center + starWidth/2) dépasse xValue => reveal
                if (groupRef.current.position.x + starWidth / 2 > xValue) {
                    onReveal(key);
                }
            });
        }
    });

    return (
        <>
            <group ref={groupRef}>
                <StarMeshes
                    starUrl={starUrl}
                    groupRef={groupRef}
                    onLoaded={(loaded, width) => {
                        setIsLoaded(loaded);
                        setStarWidth(width);
                    }}
                />
                {!isLoaded && null}
            </group>
            <ParticleSystem particles={particles} setParticles={setParticles} />
        </>
    );
};

/*
  ─────────────────────────────────────────────────────────────────
  5) Composant NavBar principal
     - Gère la révélation des textes
  ─────────────────────────────────────────────────────────────────
*/
export default function NavBar() {
    const [revealState, setRevealState] = useState({
        accueil: false,
        project: false,
        contact: false,
    });

    // Fonction de révélation
    const handleReveal = (key) => {
        setRevealState((prev) => ({ ...prev, [key]: true }));
    };

    return (
        <div className={styles.ContainerNavBar}>
            <Canvas
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 0,
                    pointerEvents: "none",
                    background: "#fff",
                }}
                camera={{ position: [0, 0, 10], orthographic: true, zoom: 20 }}
            >
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} />
                <OrbitControls
                    enableZoom={true}
                    maxDistance={10}
                    minDistance={3}
                    enablePan={false}
                />
                {/* Étoile filante */}
                <MovingStar starUrl="/logo.svg" onReveal={handleReveal} />

                {/* Post-processing : Bloom */}
                <EffectComposer>
                    <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
                </EffectComposer>

            </Canvas>

            {/* Textes */}
            <div className={styles.NavBarContent}>
                <p
                    className={styles.NavBarItem}
                    style={{
                        opacity: revealState.accueil ? 1 : 0,
                        transform: revealState.accueil ? "scale(1.2)" : "scale(0.8)",
                    }}
                >
                    Accueil
                </p>
                <p
                    className={styles.NavBarItem}
                    style={{
                        opacity: revealState.project ? 1 : 0,
                        transform: revealState.project ? "scale(1.2)" : "scale(0.8)",
                    }}
                >
                    Project
                </p>
                <p
                    className={styles.NavBarItem}
                    style={{
                        opacity: revealState.contact ? 1 : 0,
                        transform: revealState.contact ? "scale(1.2)" : "scale(0.8)",
                    }}
                >
                    Contact
                </p>

            </div>
        </div>
    );
}
