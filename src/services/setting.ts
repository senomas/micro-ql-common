import { mongodb } from "./mongodb";

export async function initSetting() {
  const setting = await mongodb.create("setting");
  setting.loadKey = data => ({ code: data.code });
}
