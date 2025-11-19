type Resource =
    | TextureResource
    | CubeTextureResource
    | ModelResource
    | StlResource
    | AudioResource;

declare interface StyleSheetCSS {
    [key: string]: React.CSSProperties;
}

type TextureResource = {
    name: string;
    type: 'texture';
    path: string;
};

type CubeTextureResource = {
    name: string;
    type: 'cubeTexture';
    path: string[];
};

type ModelResource = {
    name: string;
    type: 'gltfModel';
    path: string;
};

type StlResource = {
    name: string;
    type: 'stlModel';
    path: string;
};

type AudioResource = {
    name: string;
    type: 'audio';
    path: string;
};

type EnclosingPlane = {
    size: THREE.Vector2;
    position: THREE.Vector3;
    rotation: THREE.Euler;
};

type CameraKeyframe = {
    position: THREE.Vector3;
    focalPoint: THREE.Vector3;
};

type LoadedResource =
    | LoadedTexture
    | LoadedCubeTexture
    | LoadedModel
    | LoadedStlModel
    | LoadedAudio;

type LoadedTexture = THREE.Texture;

type LoadedModel = import('three/examples/jsm/loaders/GLTFLoader').GLTF;

type LoadedStlModel = THREE.BufferGeometry;

type LoadedCubeTexture = THREE.CubeTexture;

type LoadedAudio = AudioBuffer;

type ResourceType =
    | 'texture'
    | 'cubeTexture'
    | 'gltfModel'
    | 'stlModel'
    | 'audio';
