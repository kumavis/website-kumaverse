import * as THREE from 'three';
import Application from '../Application';
import BakedModel from '../Utils/BakedModel';
import Resources from '../Utils/Resources';

export default class Computer {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    bakedModel: BakedModel;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        this.bakeModel();
        this.setModel();
    }

    bakeModel() {
        this.bakedModel = new BakedModel(
            this.resources.items.gltfModel.computerSetupModel,
            this.resources.items.texture.computerSetupTexture,
            900
        );
    }

    setModel() {
        const model = this.bakedModel.getModel();
        model.position.set(-180, -40, 140);
        model.rotation.y = THREE.MathUtils.degToRad(-12);
        this.scene.add(model);
    }
}
