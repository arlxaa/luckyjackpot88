import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { PUSHER } from '../../config/balance';

export type CoinKind = 'normal' | 'bonus' | 'rain' | 'jackpot';

export interface CoinData {
  id: number;
  x: number;
  kind: CoinKind;
  /** pre-scattered pile coins (free) vs player-dropped */
  free?: boolean;
}

const KIND_COLOR: Record<CoinKind, string> = {
  normal: '#e89b2d',
  bonus: '#4caf6d',
  rain: '#2ec4b6',
  jackpot: '#ffd700',
};

function PusherBar() {
  const ref = useRef<RapierRigidBody>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Slow sinusoidal push along Z. Reduced motion handled by parent (static when on).
    const z = -0.9 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 1.1;
    ref.current?.setNextKinematicTranslation({ x: 0, y: 0.42, z });
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders="cuboid" friction={0.6}>
      <mesh castShadow>
        <boxGeometry args={[3.6, 0.55, 0.7]} />
        <meshStandardMaterial color="#8e1b20" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[3.7, 0.08, 0.75]} />
        <meshStandardMaterial color="#ffd166" roughness={0.4} />
      </mesh>
    </RigidBody>
  );
}

function Coin({ data, onCollect }: { data: CoinData; onCollect: (id: number, pos: THREE.Vector3, kind: CoinKind) => void }) {
  const ref = useRef<RapierRigidBody>(null);
  const collected = useRef(false);
  const pos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const body = ref.current;
    if (!body || collected.current) return;
    const t = body.translation();
    pos.set(t.x, t.y, t.z);
    const front = t.z > PUSHER.frontZ;
    const sideLost = Math.abs(t.x) > PUSHER.sideX && t.y < 0.5;
    const fell = t.y < PUSHER.killY;
    if (front || sideLost || fell) {
      collected.current = true;
      onCollect(data.id, pos.clone(), data.kind);
    }
  });

  // Spawn scatter for free pile coins so the tray looks alive on load.
  const spawn = useMemo(() => {
    if (!data.free) return { x: data.x, y: 4, z: -1.2 };
    return {
      x: (Math.random() - 0.5) * 2.6,
      y: 1 + Math.random() * 2,
      z: -0.6 + Math.random() * 2.2,
    };
  }, [data]);

  return (
    <RigidBody
      ref={ref}
      colliders="cuboid"
      position={[spawn.x, spawn.y, spawn.z]}
      rotation={[Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4]}
      friction={0.7}
      restitution={0.15}
      canSleep
      ccd
      angularDamping={0.6}
      linearDamping={0.1}
    >
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.09, 14]} />
        <meshStandardMaterial
          color={KIND_COLOR[data.kind]}
          roughness={0.35}
          metalness={0.25}
          emissive={data.kind === 'normal' ? '#000000' : KIND_COLOR[data.kind]}
          emissiveIntensity={data.kind === 'normal' ? 0 : 0.35}
        />
      </mesh>
      {data.kind !== 'normal' && (
        <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.2, 14]} />
          <meshBasicMaterial color="#fff6e5" side={THREE.DoubleSide} />
        </mesh>
      )}
    </RigidBody>
  );
}

export function PusherScene({ coins, onCollect, paused }: {
  coins: CoinData[];
  onCollect: (id: number, pos: THREE.Vector3, kind: CoinKind) => void;
  paused: boolean;
}) {
  return (
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} paused={paused}>
      {/* Main tray floor */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.8}>
        <mesh receiveShadow position={[0, -0.05, 0.4]}>
          <boxGeometry args={[4.4, 0.1, 5.4]} />
          <meshStandardMaterial color="#c99a5b" roughness={0.8} />
        </mesh>
      </RigidBody>
      {/* Back platform (under pusher) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.15, -2.2]}>
          <boxGeometry args={[4.4, 0.4, 1.4]} />
          <meshStandardMaterial color="#8a5a2e" roughness={0.8} />
        </mesh>
      </RigidBody>
      {/* Side walls */}
      {[-2.2, 2.2].map((x) => (
        <RigidBody key={x} type="fixed" colliders="cuboid">
          <mesh position={[x, 0.6, 0.4]}>
            <boxGeometry args={[0.15, 1.2, 5.6]} />
            <meshStandardMaterial color="#c1272d" roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}
      {/* Back wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.8, -2.9]}>
          <boxGeometry args={[4.5, 1.6, 0.15]} />
          <meshStandardMaterial color="#c1272d" roughness={0.6} />
        </mesh>
      </RigidBody>
      {/* Front lip (low rim — coins slide over it) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.02, 2.62]}>
          <boxGeometry args={[4.4, 0.12, 0.25]} />
          <meshStandardMaterial color="#ffd166" roughness={0.5} />
        </mesh>
      </RigidBody>

      <PusherBar />

      {coins.map((c) => (
        <Coin key={c.id} data={c} onCollect={onCollect} />
      ))}
    </Physics>
  );
}
