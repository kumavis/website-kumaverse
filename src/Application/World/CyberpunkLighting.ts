import * as THREE from 'three';
import Application from '../Application';
import Time from '../Utils/Time';

export default class CyberpunkLighting {
    application: Application;
    scene: THREE.Scene;
    time: Time;
    pulseLight: THREE.PointLight;
    hologramPlane: THREE.Mesh;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.time = this.application.time;

        this.setupAtmosphere();
        this.setupLights();
        this.createHologram();
    }

    setupAtmosphere() {
        this.scene.background = new THREE.Color(0x050111);
        this.scene.fog = new THREE.FogExp2(0x0a0218, 0.00009);
    }

    setupLights() {
        const hemisphere = new THREE.HemisphereLight(0x8742ff, 0x020108, 0.4);
        this.scene.add(hemisphere);

        const keyLight = new THREE.SpotLight(0x9f4ef5, 1.6, 6000, Math.PI / 5, 0.4, 2);
        keyLight.position.set(-1200, 2600, -400);
        keyLight.target.position.set(0, 600, 0);
        keyLight.castShadow = true;
        this.scene.add(keyLight);
        this.scene.add(keyLight.target);

        const fillLight = new THREE.PointLight(0x33c6ff, 2.4, 5000, 1.5);
        fillLight.position.set(1800, 1400, 600);
        this.scene.add(fillLight);

        this.pulseLight = new THREE.PointLight(0xff50ff, 5, 1800, 2);
        this.pulseLight.position.set(400, 900, -200);
        this.scene.add(this.pulseLight);
    }

    createHologram() {
        const geometry = new THREE.PlaneGeometry(1200, 480);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
        });
        this.hologramPlane = new THREE.Mesh(geometry, material);
        this.hologramPlane.position.set(-800, 1200, -800);
        this.hologramPlane.rotation.y = THREE.MathUtils.degToRad(20);

        const gradient = this.createGradientTexture();
        (this.hologramPlane.material as THREE.MeshBasicMaterial).map = gradient;
        (this.hologramPlane.material as THREE.MeshBasicMaterial).needsUpdate = true;

        this.scene.add(this.hologramPlane);
    }

    createGradientTexture() {
        const size = 256;
        const data = new Uint8Array(4 * size);
        for (let i = 0; i < size; i++) {
            const t = i / (size - 1);
            const r = 80 + t * 160;
            const g = 30 + t * 120;
            const b = 120 + t * 80;
            const idx = i * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
        }

        const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return texture;
    }

    update() {
        const pulse = (Math.sin(this.time.elapsed * 0.002) + 1) / 2;
        this.pulseLight.intensity = 4 + pulse * 4;
        if (this.hologramPlane) {
            const material = this.hologramPlane
                .material as THREE.MeshBasicMaterial;
            material.opacity = 0.18 + pulse * 0.2;
        }
    }
}
