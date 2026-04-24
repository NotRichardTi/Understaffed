import type { Scene } from "@babylonjs/core/scene";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  InputText,
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";

export interface ScreenHandle {
  dispose: () => void;
}

export interface MainMenuActions {
  onSinglePlayer: () => void;
  onMultiplayer: () => void;
}

export interface MpMenuActions {
  onBack: () => void;
  onHost: (name: string) => void;
  onJoin: (name: string, code: string) => void;
}

function makeUi(scene: Scene): AdvancedDynamicTexture {
  const t = AdvancedDynamicTexture.CreateFullscreenUI("MenuUI", true, scene);
  t.idealWidth = 1280;
  t.idealHeight = 800;
  t.useSmallestIdeal = true;
  return t;
}

function makePanel(name: string): StackPanel {
  const panel = new StackPanel(name);
  panel.isVertical = true;
  panel.width = "460px";
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  panel.spacing = 10;
  return panel;
}

function makeTitle(text: string, size = 48): TextBlock {
  const t = new TextBlock();
  t.text = text;
  t.color = "#e6edf3";
  t.fontSize = size;
  t.height = `${size + 24}px`;
  t.fontFamily = '"VT323", ui-monospace, monospace';
  return t;
}

function makeButton(label: string, onClick: () => void, primary = false): Button {
  const b = Button.CreateSimpleButton(label, label);
  b.height = "52px";
  b.color = "#e6edf3";
  b.background = primary ? "#2b5d8a" : "#1f2631";
  b.thickness = 1;
  b.cornerRadius = 4;
  b.fontSize = 18;
  b.fontFamily = '"VT323", ui-monospace, monospace';
  b.onPointerUpObservable.add(() => onClick());
  b.onPointerEnterObservable.add(() => {
    b.background = primary ? "#3a7bb3" : "#2a3340";
  });
  b.onPointerOutObservable.add(() => {
    b.background = primary ? "#2b5d8a" : "#1f2631";
  });
  return b;
}

function makeHint(text: string): TextBlock {
  const t = new TextBlock();
  t.text = text;
  t.color = "#8892a0";
  t.fontSize = 14;
  t.height = "22px";
  t.fontFamily = '"VT323", ui-monospace, monospace';
  return t;
}

export function createMainMenu(scene: Scene, actions: MainMenuActions): ScreenHandle {
  const t = makeUi(scene);
  const panel = makePanel("mainMenu");

  panel.addControl(makeTitle("UNDERSTAFFED"));
  panel.addControl(makeHint("A co-op space shooter"));
  const spacer = new Rectangle();
  spacer.height = "20px";
  spacer.thickness = 0;
  panel.addControl(spacer);
  panel.addControl(makeButton("Single Player", actions.onSinglePlayer, true));
  panel.addControl(makeButton("Multiplayer", actions.onMultiplayer));

  t.addControl(panel);
  return {
    dispose() {
      t.removeControl(panel);
      panel.dispose();
      t.dispose();
    },
  };
}

export function createMpMenu(scene: Scene, actions: MpMenuActions): ScreenHandle {
  const t = makeUi(scene);
  const panel = makePanel("mpMenu");

  panel.addControl(makeTitle("MULTIPLAYER", 36));

  panel.addControl(makeHint("Your name"));
  const nameInput = new InputText("name");
  nameInput.width = "100%";
  nameInput.height = "44px";
  nameInput.color = "#e6edf3";
  nameInput.background = "#1f2631";
  nameInput.focusedBackground = "#2a3340";
  nameInput.fontSize = 18;
  nameInput.fontFamily = '"VT323", ui-monospace, monospace';
  nameInput.text = "Player";
  panel.addControl(nameInput);

  panel.addControl(makeHint("Lobby code (to join)"));
  const codeInput = new InputText("code");
  codeInput.width = "100%";
  codeInput.height = "44px";
  codeInput.color = "#e6edf3";
  codeInput.background = "#1f2631";
  codeInput.focusedBackground = "#2a3340";
  codeInput.fontSize = 18;
  codeInput.fontFamily = '"VT323", ui-monospace, monospace';
  codeInput.text = "";
  codeInput.placeholderText = "ABCD";
  panel.addControl(codeInput);

  const spacer = new Rectangle();
  spacer.height = "16px";
  spacer.thickness = 0;
  panel.addControl(spacer);

  panel.addControl(makeButton("Host Lobby", () => {
    const name = (nameInput.text || "Player").trim();
    actions.onHost(name);
  }, true));
  panel.addControl(makeButton("Join Lobby", () => {
    const name = (nameInput.text || "Player").trim();
    const code = (codeInput.text || "").trim().toUpperCase();
    if (code.length >= 4) actions.onJoin(name, code);
  }));
  panel.addControl(makeButton("Back", actions.onBack));

  t.addControl(panel);
  return {
    dispose() {
      t.removeControl(panel);
      panel.dispose();
      t.dispose();
    },
  };
}
