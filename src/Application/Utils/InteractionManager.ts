import * as THREE from 'three';
import Application from '../Application';
import Camera from '../Camera/Camera';
import Sizes from './Sizes';
import Mouse from './Mouse';

export type InteractionHandlers = {
    onClick?: (payload: InteractionPayload) => void;
    onPointerEnter?: (payload: InteractionPayload) => void;
    onPointerLeave?: (payload: InteractionPayload) => void;
};

export type InteractionPayload = {
    object: THREE.Object3D;
    intersection: THREE.Intersection;
    event: PointerEvent;
};

export default class InteractionManager {
    application: Application;
    scene: THREE.Scene;
    camera: Camera;
    sizes: Sizes;
    mouse: Mouse;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    objects: Set<THREE.Object3D>;
    handlers: Map<string, InteractionHandlers>;
    hovered: THREE.Object3D | null;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.camera = this.application.camera;
        this.sizes = this.application.sizes;
        this.mouse = this.application.mouse;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.objects = new Set();
        this.handlers = new Map();
        this.hovered = null;

        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointerleave', this.onPointerLeave);
    }

    register(object: THREE.Object3D, handlerConfig: InteractionHandlers = {}) {
        this.objects.add(object);
        this.handlers.set(object.uuid, handlerConfig);
    }

    unregister(object: THREE.Object3D) {
        this.objects.delete(object);
        this.handlers.delete(object.uuid);
        if (this.hovered?.uuid === object.uuid) {
            this.hovered = null;
        }
    }

    dispose() {
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointerleave', this.onPointerLeave);
        this.objects.clear();
        this.handlers.clear();
    }

    onPointerMove = (event: PointerEvent) => {
        this.updatePointer(event);
        this.handleHover(event);
    };

    onPointerDown = (event: PointerEvent) => {
        this.updatePointer(event);
        this.handleClick(event);
    };

    onPointerLeave = (event: PointerEvent) => {
        if (event.relatedTarget === null) {
            this.clearHover(event);
        }
    };

    updatePointer(event: PointerEvent) {
        const width = this.sizes.width || window.innerWidth;
        const height = this.sizes.height || window.innerHeight;

        this.pointer.x = (event.clientX / width) * 2 - 1;
        this.pointer.y = -(event.clientY / height) * 2 + 1;
    }

    handleHover(event: PointerEvent) {
        const hit = this.getIntersection(event);
        const nextHovered = hit?.object || null;

        if (nextHovered?.uuid === this.hovered?.uuid) {
            return;
        }

        if (this.hovered) {
            const leaveHandlers = this.handlers.get(this.hovered.uuid);
            if (leaveHandlers?.onPointerLeave && hit) {
                leaveHandlers.onPointerLeave({ object: this.hovered, intersection: hit, event });
            } else if (leaveHandlers?.onPointerLeave) {
                leaveHandlers.onPointerLeave({
                    object: this.hovered,
                    intersection: hit ?? ({} as THREE.Intersection),
                    event,
                });
            }
        }

        this.hovered = nextHovered;

        if (hit && nextHovered) {
            const enterHandlers = this.handlers.get(nextHovered.uuid);
            enterHandlers?.onPointerEnter?.({ object: nextHovered, intersection: hit, event });
        }
    }

    handleClick(event: PointerEvent) {
        const hit = this.getIntersection(event);
        if (!hit || !hit.object) return;

        const handlers = this.handlers.get(hit.object.uuid);
        handlers?.onClick?.({ object: hit.object, intersection: hit, event });
    }

    clearHover(event: PointerEvent) {
        if (this.hovered) {
            const handlers = this.handlers.get(this.hovered.uuid);
            handlers?.onPointerLeave?.({
                object: this.hovered,
                intersection: {} as THREE.Intersection,
                event,
            });
        }
        this.hovered = null;
    }

    getIntersection(event: PointerEvent) {
        if (this.mouse.inComputer) return null;
        if (!this.objects.size) return null;

        this.raycaster.setFromCamera(this.pointer, this.camera.instance);
        const intersects = this.raycaster.intersectObjects(
            [...this.objects].map((obj) => obj),
            true
        );

        if (!intersects.length) {
            return null;
        }

        for (const intersection of intersects) {
            const registered = this.findRegisteredAncestor(intersection.object);
            if (registered) {
                intersection.object = registered;
                return intersection;
            }
        }

        return null;
    }

    findRegisteredAncestor(object: THREE.Object3D | null): THREE.Object3D | null {
        if (!object) return null;
        if (this.handlers.has(object.uuid)) return object;
        return this.findRegisteredAncestor(object.parent);
    }
}
