import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const TEE_ASSET_URL = "/assets/models/MORI_Classic_Tee.glb";
export const SHIRT_ASSET_URL = "/assets/models/MORI_Button_Shirt.glb";
export const SWEATER_ASSET_URL = "/assets/models/MORI_Knit_Sweater.glb";
export const PANTS_ASSET_URL = "/assets/models/MORI_Straight_Pants.glb";
export const SHORTS_ASSET_URL = "/assets/models/MORI_Casual_Shorts.glb";
export const JACKET_ASSET_URL = "/assets/models/MORI_Utility_Jacket.glb";
export const COAT_ASSET_URL = "/assets/models/MORI_Long_Coat.glb";

export function rebindGarmentToRig(garment, targetRoot) {
  if (!garment?.isSkinnedMesh) throw new Error("独立服装必须包含 SkinnedMesh");
  const bones = garment.skeleton.bones.map(sourceBone => {
    const targetBone = targetRoot.getObjectByName(sourceBone.name);
    if (!targetBone?.isBone) throw new Error("人物缺少服装骨骼：" + sourceBone.name);
    return targetBone;
  });
  const boneInverses = garment.skeleton.boneInverses.map(matrix => matrix.clone());
  const bindMatrix = garment.bindMatrix.clone();
  garment.removeFromParent();
  targetRoot.add(garment);
  garment.material = Array.isArray(garment.material)
    ? garment.material.map(material => material.clone())
    : garment.material.clone();
  garment.bind(new THREE.Skeleton(bones, boneInverses), bindMatrix);
  garment.frustumCulled = false;
  garment.castShadow = true;
  garment.receiveShadow = true;
  return garment;
}

export async function loadIndependentGarment(targetRoot, url = PANTS_ASSET_URL) {
  const gltf = await new GLTFLoader().loadAsync(url);
  let garment = null;
  gltf.scene.traverse(object => {
    if (!garment && object.isSkinnedMesh) garment = object;
  });
  if (!garment?.userData.moriCategory || !garment.userData.moriStyle) {
    throw new Error("独立服装缺少类别或款式元数据");
  }
  return rebindGarmentToRig(garment, targetRoot);
}
