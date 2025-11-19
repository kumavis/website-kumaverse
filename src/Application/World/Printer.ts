import * as THREE from 'three';
import Application from '../Application';
import Resources from '../Utils/Resources';
import InteractionManager from '../Utils/InteractionManager';
import Time from '../Utils/Time';

const SKIRT_RESOURCES = [
    'voronFrontSkirtA',
    'voronFrontSkirtB',
    'voronRearSkirt',
    'voronSideSkirtA',
    'voronSideSkirtB',
] as const;

const PRINT_HEAD_PATH_STEPS = 4;

export default class Printer {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    interactions: InteractionManager;
    time: Time;
    group: THREE.Group;
    skirtMaterial: THREE.MeshStandardMaterial;
    accentMaterial: THREE.MeshStandardMaterial;
    neonMaterial: THREE.MeshStandardMaterial;
    printerRoot: THREE.Group;
    bedMesh?: THREE.Mesh;
    printHead?: THREE.Group;
    boundingBox: THREE.Box3;
    animationSpeed: number;
    highlightTimeline: number;
    printArea: { width: number; depth: number; height: number };

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;
        this.interactions = this.application.interactions;
        this.time = this.application.time;
        this.group = new THREE.Group();
        this.group.name = 'cyberpunk-printer';
        this.scene.add(this.group);

        this.skirtMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x2e0c3a),
            roughness: 0.35,
            metalness: 0.4,
            emissive: new THREE.Color(0x6f18ff),
            emissiveIntensity: 0.15,
        });

        this.accentMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x111626),
            roughness: 0.6,
            metalness: 0.2,
            emissive: new THREE.Color(0x18394b),
            emissiveIntensity: 0.05,
        });

        this.neonMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x0a0316),
            emissive: new THREE.Color(0x8033ff),
            emissiveIntensity: 1.4,
            roughness: 0.1,
            metalness: 0.8,
        });

        this.printerRoot = new THREE.Group();
        this.boundingBox = new THREE.Box3();
        this.animationSpeed = 0.00005;
        this.highlightTimeline = 0;
        this.printArea = { width: 200, depth: 200, height: 180 };

        this.resources.on('ready', () => {
            this.buildPrinter();
        });
    }

    buildPrinter() {
        const skirtMeshes = this.createSkirts();
        skirtMeshes.forEach((mesh) => this.printerRoot.add(mesh));

        this.boundingBox.setFromObject(this.printerRoot);
        const center = this.boundingBox.getCenter(new THREE.Vector3());
        this.printerRoot.position.sub(center);

        this.createFrameExtrusions();
        this.createPrintBed();
        this.createPrintHead();
        this.addAccentNeon();

        this.group.add(this.printerRoot);
        this.group.scale.setScalar(0.45);
        this.group.position.set(520, 460, -300);
        this.group.rotation.y = THREE.MathUtils.degToRad(28);

        this.interactions.register(this.group, {
            onPointerEnter: () => this.onHover(true),
            onPointerLeave: () => this.onHover(false),
            onClick: () => this.onClick(),
        });
    }

    createSkirts() {
        const meshes: THREE.Mesh[] = [];
        SKIRT_RESOURCES.forEach((name) => {
            const geometry = this.resources.items.stlModel[name];
            if (!geometry) return;

            const mesh = new THREE.Mesh(geometry.clone(), this.skirtMaterial);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            meshes.push(mesh);

            if (name.includes('_x2')) {
                const mirrored = mesh.clone();
                mirrored.scale.x *= -1;
                meshes.push(mirrored);
            }
        });
        return meshes;
    }

    createFrameExtrusions() {
        const size = this.boundingBox.getSize(new THREE.Vector3());
        const baseY = this.boundingBox.min.y;
        const frameHeight = size.y * 0.95;
        const frameThickness = size.x * 0.025;
        const frameOffset = size.x * 0.45;

        const columnGeometry = new THREE.BoxGeometry(
            frameThickness,
            frameHeight,
            frameThickness
        );

        const positions = [
            new THREE.Vector3(-frameOffset, baseY + frameHeight / 2, -frameOffset),
            new THREE.Vector3(frameOffset, baseY + frameHeight / 2, -frameOffset),
            new THREE.Vector3(-frameOffset, baseY + frameHeight / 2, frameOffset),
            new THREE.Vector3(frameOffset, baseY + frameHeight / 2, frameOffset),
        ];

        positions.forEach((pos) => {
            const column = new THREE.Mesh(columnGeometry, this.accentMaterial);
            column.position.copy(pos);
            column.castShadow = true;
            column.receiveShadow = true;
            this.printerRoot.add(column);
        });

        const beamGeometry = new THREE.BoxGeometry(size.x * 0.9, frameThickness, frameThickness);
        const beams = [
            new THREE.Vector3(0, baseY + frameHeight * 0.9, -frameOffset),
            new THREE.Vector3(0, baseY + frameHeight * 0.9, frameOffset),
        ];

        beams.forEach((pos) => {
            const beam = new THREE.Mesh(beamGeometry, this.accentMaterial);
            beam.position.copy(pos);
            beam.castShadow = true;
            beam.receiveShadow = true;
            this.printerRoot.add(beam);
        });
    }

    createPrintBed() {
        const size = this.boundingBox.getSize(new THREE.Vector3());
        const baseY = this.boundingBox.min.y;
        const bedHeight = size.y * 0.15 + baseY;

        const bedGeometry = new THREE.BoxGeometry(size.x * 0.55, size.y * 0.04, size.z * 0.5);
        const bedMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x120c24),
            metalness: 0.3,
            roughness: 0.4,
            emissive: new THREE.Color(0x4b2fc5),
            emissiveIntensity: 0.3,
        });

        this.bedMesh = new THREE.Mesh(bedGeometry, bedMaterial);
        this.bedMesh.position.set(0, bedHeight, 0);
        this.bedMesh.receiveShadow = true;
        this.printerRoot.add(this.bedMesh);

        this.printArea = {
            width: bedGeometry.parameters.width * 0.85,
            depth: bedGeometry.parameters.depth * 0.8,
            height: bedHeight + bedGeometry.parameters.height / 2 + size.y * 0.25,
        };
    }

    createPrintHead() {
        const headGroup = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(
            this.printArea.width * 0.22,
            this.printArea.width * 0.1,
            this.printArea.width * 0.2
        );

        const nozzleGeometry = new THREE.ConeGeometry(
            this.printArea.width * 0.04,
            this.printArea.width * 0.08,
            12
        );

        const body = new THREE.Mesh(bodyGeometry, this.neonMaterial);
        const nozzleMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xffd9a3),
            emissive: new THREE.Color(0xff936b),
            emissiveIntensity: 0.6,
            roughness: 0.2,
        });
        const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzle.rotation.x = Math.PI;
        nozzle.position.y = -bodyGeometry.parameters.height / 2 - nozzleGeometry.parameters.height / 2;

        headGroup.add(body);
        headGroup.add(nozzle);
        headGroup.castShadow = true;
        headGroup.name = 'printer-head';

        this.printHead = headGroup;
        this.printerRoot.add(headGroup);
    }

    addAccentNeon() {
        const arcGeometry = new THREE.TorusGeometry(
            this.boundingBox.getSize(new THREE.Vector3()).x * 0.35,
            this.boundingBox.getSize(new THREE.Vector3()).x * 0.01,
            8,
            60,
            Math.PI / 1.6
        );
        const arc = new THREE.Mesh(arcGeometry, this.neonMaterial);
        arc.rotation.z = Math.PI / 2;
        arc.position.set(0, this.boundingBox.max.y * 0.95, -this.boundingBox.getSize(new THREE.Vector3()).z * 0.3);
        arc.castShadow = true;
        this.printerRoot.add(arc);
    }

    onHover(state: boolean) {
        this.highlightTimeline = state ? 1 : -1;
    }

    onClick() {
        this.animationSpeed = this.animationSpeed === 0.00005 ? 0.00012 : 0.00005;
    }

    update() {
        if (!this.printHead) return;

        this.animatePrintHead();
        this.animateHighlight();
    }

    animatePrintHead() {
        if (!this.printHead) return;
        const elapsed = (this.time.elapsed * this.animationSpeed) % 1;
        const segment = Math.floor(elapsed * PRINT_HEAD_PATH_STEPS);
        const segmentProgress = elapsed * PRINT_HEAD_PATH_STEPS - segment;

        const corners = [
            new THREE.Vector3(-this.printArea.width / 2, this.printArea.height, -this.printArea.depth / 2),
            new THREE.Vector3(this.printArea.width / 2, this.printArea.height, -this.printArea.depth / 2),
            new THREE.Vector3(this.printArea.width / 2, this.printArea.height, this.printArea.depth / 2),
            new THREE.Vector3(-this.printArea.width / 2, this.printArea.height, this.printArea.depth / 2),
            new THREE.Vector3(-this.printArea.width / 2, this.printArea.height, -this.printArea.depth / 2),
        ];

        const start = corners[segment];
        const end = corners[segment + 1];
        const currentPosition = start.clone().lerp(end, segmentProgress);
        currentPosition.y += Math.sin(this.time.elapsed * 0.002) * 4;

        this.printHead.position.copy(currentPosition);
        this.printHead.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    }

    animateHighlight() {
        if (!this.skirtMaterial) return;

        const delta = this.time.delta * 0.001 * this.highlightTimeline;
        const intensity = THREE.MathUtils.clamp(
            this.skirtMaterial.emissiveIntensity + delta * 0.8,
            0.15,
            0.6
        );
        this.skirtMaterial.emissiveIntensity = intensity;
        this.neonMaterial.emissiveIntensity = 1.2 + Math.sin(this.time.elapsed * 0.004) * 0.3;
    }
}
