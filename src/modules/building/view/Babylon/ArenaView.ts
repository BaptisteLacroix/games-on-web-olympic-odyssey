import { ActionManager, ExecuteCodeAction, Mesh, Scene, Vector3 } from '@babylonjs/core';
import { ArenaModel } from '@building/model/ArenaModel.ts';
import { ViewInitable } from '@core/Interfaces.ts';
import { ArenaPresenter } from '../../presenter/ArenaPresenter.ts';
import { getPosition, PositionTypes } from '@map/core/GamePlacer.ts';
import { importModel } from '@core/ModelImporter.ts';

export class ArenaView implements ViewInitable {
  private arenaModel: ArenaModel;
  private scene!: Scene;
  private _mesh!: Mesh;
  private arenaPresenter: ArenaPresenter;
  private position: Vector3;
  private static readonly SCALE = 0.5;

  constructor(arenaPresenter: ArenaPresenter) {
    this.arenaPresenter = arenaPresenter;
    this.arenaModel = this.arenaPresenter.arena;
    this.position = getPosition(this.arenaModel.position, PositionTypes.BUILDING);
  }

  async initView(scene: Scene) {
    this.scene = scene;
    await this.createMesh(this.position);
    this.addActionManager();
  }

  // Create a cube above the tile
  public async createMesh(vector: Vector3) {
    const importedModel = await importModel('arena.glb', { scene: this.scene, path: 'arena/', multiMaterial: true });
    const mesh = importedModel.mesh;
    if (!mesh) throw new Error('Mesh not found');
    mesh.scaling = new Vector3(ArenaView.SCALE, ArenaView.SCALE, ArenaView.SCALE);
    mesh.position = vector.add(new Vector3(0, 0.1, 0));
    this._mesh = mesh;
  }

  private addActionManager(): void {
    // Add onclick listener
    this._mesh.actionManager = new ActionManager(this.scene);
    this._mesh.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnPickTrigger,
        },
        () => {
          this.arenaPresenter.openModal();
        },
      ),
    );
  }

  get mesh(): Mesh {
    return this._mesh;
  }

  unMountView(): void {
    this._mesh.dispose();
  }
}
