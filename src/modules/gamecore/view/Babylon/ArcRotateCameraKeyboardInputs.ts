import { ArcRotateCamera, ICameraInput, Matrix, Nullable, Vector3 } from '@babylonjs/core';
import { GameCorePresenter } from '../../presenter/GameCorePresenter.ts';
import { config, debugConfig } from '../../../../core/Interfaces.ts';

export class ArcRotateCameraKeyboardInputs implements ICameraInput<ArcRotateCamera> {
  private _keys: string[] = [];
  public _keysUp: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysUp;
  public _keysDown: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysDown;
  public _keysLeft: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysLeft;
  public _keysRight: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysRight;
  public _keysZoomIn: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysZoomIn;
  public _keysZoomOut: string[] = config.arcRotateCameraKeyboardInputs.controls.keys.keysZoomOut;
  private _activeMove: boolean = true;
  private _onKeyUp: ((evt: KeyboardEvent) => void) | null | undefined;
  private _onKeyDown: ((evt: KeyboardEvent) => void) | null | undefined;
  public camera: Nullable<ArcRotateCamera>;
  private _gameCorePresenter: GameCorePresenter;
  private _currentHeightPosition: number = config.arcRotateCameraKeyboardInputs.config.defaultPositionHeight;
  private _currentHeightTarget: number = config.arcRotateCameraKeyboardInputs.config.defaultTargetHeight;

  constructor(camera: ArcRotateCamera, gameCorePresenter: GameCorePresenter) {
    this.camera = camera;
    this._gameCorePresenter = gameCorePresenter;
  }

  public attachControl(noPreventDefault?: boolean): void {
    const _this = this;
    const engine = this.camera!.getEngine();
    const element = engine.getInputElement();
    if (!this._onKeyDown) {
      element!.tabIndex = 1;
      this._onKeyDown = function (evt) {
        if (ArcRotateCameraKeyboardInputs.isCameraMoveKey(_this, evt)) {
          const index = _this._keys.indexOf(evt.key);
          if (index === -1) {
            _this._keys.push(evt.key);
          }
          if (!noPreventDefault) {
            evt.preventDefault();
          }
        }
      };
      this._onKeyUp = function (evt) {
        if (ArcRotateCameraKeyboardInputs.isCameraMoveKey(_this, evt)) {
          const index = _this._keys.indexOf(evt.key);
          if (index >= 0) {
            _this._keys.splice(index, 1);
          }
          if (!noPreventDefault) {
            evt.preventDefault();
          }
        }
      };
      element!.addEventListener('keydown', this._onKeyDown, false);
      element!.addEventListener('keyup', this._onKeyUp, false);
      element!.addEventListener('keypress', function (evt) {
        if (config.arcRotateCameraKeyboardInputs.controls.keys.resetPosition.indexOf(evt.key) !== -1) {
          _this.resetPositionCamera();
        }
      });
      element!.addEventListener('blur', function () {
        _this._keys = [];
      });
    }
  }

  static isCameraMoveKey(_this: ArcRotateCameraKeyboardInputs, evt: KeyboardEvent) {
    if (debugConfig.logs.arcRotateCameraKeyboardInputs.isCameraMoveKey)
      console.log(
        'isCameraMoveKey',
        evt.key,
        _this._keysUp,
        _this._keysDown,
        _this._keysLeft,
        _this._keysRight,
        _this._keysZoomIn,
        _this._keysZoomOut,
      );
    return (
      _this._keysUp.indexOf(evt.key) !== -1 ||
      _this._keysDown.indexOf(evt.key) !== -1 ||
      _this._keysLeft.indexOf(evt.key) !== -1 ||
      _this._keysRight.indexOf(evt.key) !== -1 ||
      _this._keysZoomIn.indexOf(evt.key) !== -1 ||
      _this._keysZoomOut.indexOf(evt.key) !== -1
    );
  }

  public checkInputs(): void {
    if (this._onKeyDown && this._activeMove) {
      if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkInputs)
        console.log(
          'checkInputs',
          this._keys,
          this._keysUp,
          this._keysDown,
          this._keysLeft,
          this._keysRight,
          this._keysZoomIn,
          this._keysZoomOut,
        );
      const speed = 2 * this.camera!._computeLocalCameraSpeed();
      let transformMatrix = Matrix.Zero();
      let localDirection = Vector3.Zero();
      let transformedDirection = Vector3.Zero();

      const keys = [
        ...this._keysUp,
        ...this._keysDown,
        ...this._keysLeft,
        ...this._keysRight,
        ...this._keysZoomIn,
        ...this._keysZoomOut,
      ];
      const pressedKeys = this._keys.filter((key) => keys.includes(key));

      for (const key of pressedKeys) {
        if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkInputs)
          console.log('key', key, this._keys, pressedKeys);
        this.checkKeyInput(key, localDirection, speed);
        this.checkMovementIsPossible(transformedDirection, transformMatrix, localDirection, key);
      }
    }
  }

  private checkKeyInput(keyCode: string, localDirection: Vector3, speed: number) {
    if (this._keysLeft.indexOf(keyCode) !== -1) {
      localDirection.copyFromFloats(-speed, 0, 0);
    } else if (this._keysRight.indexOf(keyCode) !== -1) {
      localDirection.copyFromFloats(speed, 0, 0);
    } else if (this._keysUp.indexOf(keyCode) !== -1) {
      if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkKeyInputs)
        console.log('keyUp', keyCode, this.camera!.target, this.camera!.position);
      localDirection.copyFromFloats(0, speed, speed);
    } else if (this._keysDown.indexOf(keyCode) !== -1) {
      localDirection.copyFromFloats(0, -speed, -speed);
    } else if (this._keysZoomIn.indexOf(keyCode) !== -1) {
      const newTargetPosition = this.camera!.target.add(new Vector3(0, 0, speed));
      if (newTargetPosition.y >= config.arcRotateCameraKeyboardInputs.config.maxYZoomIn) {
        localDirection.copyFromFloats(0, 0, speed * 2);
        this.checkTargetIsWithinMapLimits(newTargetPosition);
      }
    } else if (this._keysZoomOut.indexOf(keyCode) !== -1) {
      const newTargetPosition = this.camera!.target.add(new Vector3(0, 0, -speed));
      if (newTargetPosition.y <= config.arcRotateCameraKeyboardInputs.config.maxYZoomOut) {
        localDirection.copyFromFloats(0, 0, -speed * 2);
        this.checkTargetIsWithinMapLimits(newTargetPosition);
      }
    }
  }

  private checkTargetIsWithinMapLimits(newTargetPosition: Vector3) {
    const mapLimits = this._gameCorePresenter.getMapLimits();
    const zoomAdjustment =
      this.camera!.position.y == config.arcRotateCameraKeyboardInputs.config.defaultPositionHeight
        ? 0
        : config.arcRotateCameraKeyboardInputs.config.defaultPositionHeight - this.camera!.position.y;
    if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkTargetIsWithinMapLimits)
      console.log('newTargetPosition', newTargetPosition, mapLimits);
    if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkTargetIsWithinMapLimits)
      console.log(
        'condition',
        newTargetPosition.x >= mapLimits.left,
        newTargetPosition.x <= mapLimits.right,
        newTargetPosition.z <= mapLimits.top - 100 + zoomAdjustment,
        newTargetPosition.z >= -90,
        newTargetPosition.y >= config.arcRotateCameraKeyboardInputs.config.maxYZoomIn,
        newTargetPosition.y <= config.arcRotateCameraKeyboardInputs.config.maxYZoomOut,
      );
    if (
      newTargetPosition.x >= mapLimits.left &&
      newTargetPosition.x <= mapLimits.right &&
      newTargetPosition.z <= mapLimits.top - 100 + zoomAdjustment &&
      newTargetPosition.z >= -90 &&
      newTargetPosition.y >= config.arcRotateCameraKeyboardInputs.config.maxYZoomIn &&
      newTargetPosition.y <= config.arcRotateCameraKeyboardInputs.config.maxYZoomOut
    ) {
      if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkTargetIsWithinMapLimits)
        console.log('inside if', newTargetPosition, this.camera!.target, this.camera!.position);
      this.camera!.target = newTargetPosition;
      this._currentHeightTarget = newTargetPosition.y;
    }
  }

  private checkMovementIsPossible(
    transformedDirection: Vector3,
    transformMatrix: Matrix,
    localDirection: Vector3,
    keyCode: string,
  ) {
    // While we don't need this complex of a solution to pan on the X and Z axis, this is a good
    // way to handle movement when the camera angle isn't fixed like ours is.
    const mapLimits = this._gameCorePresenter.getMapLimits();
    const zoomAdjustment =
      this.camera!.position.y == config.arcRotateCameraKeyboardInputs.config.defaultPositionHeight
        ? 0
        : config.arcRotateCameraKeyboardInputs.config.defaultPositionHeight - this.camera!.position.y;

    if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkMovementIsPossible)
      console.log('this.camera!.position', this.camera!.position, this.camera!.target);

    // Update the camera position after checking the limits
    const newPosition = this.camera!.position.add(transformedDirection);
    if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkMovementIsPossible)
      console.log('newPosition', newPosition, localDirection, transformedDirection, mapLimits);
    // Check if the new position is within the map limits

    console.log(this.camera!.position, this.camera!.target);

    if (
      newPosition.x >= mapLimits.left &&
      newPosition.x <= mapLimits.right &&
      newPosition.z <= mapLimits.top - 100 + zoomAdjustment + 0.3 &&
      newPosition.z >= -90
    ) {
      if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkMovementIsPossible)
        console.log('Move the camera', newPosition, this.camera!.position, this.camera!.target);
      this.camera!.getViewMatrix().invertToRef(transformMatrix);
      Vector3.TransformNormalToRef(localDirection, transformMatrix, transformedDirection);
      this.camera!.position.addInPlace(transformedDirection);
      this.camera!.target.addInPlace(transformedDirection);
      if (keyCode === '+' || keyCode === '-') {
        this._currentHeightPosition = this.camera!.position.y;
        this._currentHeightTarget = this.camera!.target.y;
      } else {
        this.camera!.position.y = this._currentHeightPosition;
        this.camera!.target.y = this._currentHeightTarget;
      }
      if (debugConfig.logs.arcRotateCameraKeyboardInputs.checkMovementIsPossible)
        console.log('newPosition', newPosition, this.camera!.position, this.camera!.target);
    } else if (newPosition.x < mapLimits.left) {
      this.camera!.position.x = mapLimits.left;
      this.camera!.target.x = mapLimits.left;
    } else if (newPosition.x > mapLimits.right) {
      this.camera!.position.x = mapLimits.right - 0.5;
      this.camera!.target.x = mapLimits.right - 0.5;
    } else if (newPosition.z > mapLimits.top - 100 + zoomAdjustment) {
      this.camera!.position.z = mapLimits.top - 100 + zoomAdjustment - 0.5;
      this.camera!.target.z = mapLimits.top;
    } else if (newPosition.z < -90) {
      this.camera!.position.z = -90;
      this.camera!.target.z = 10;
    }
  }

  public detachControl(): void {
    if (debugConfig.logs.arcRotateCameraKeyboardInputs.detachControl) console.log('detachControl');
    const engine = this.camera!.getEngine();
    const element = engine.getInputElement();
    if (!element) return;
    if (this._onKeyDown) {
      element.removeEventListener('keydown', this._onKeyDown);
      this._keys = [];
      this._onKeyDown = null;
    }
    if (this._onKeyUp) {
      element.removeEventListener('keyup', this._onKeyUp);
      this._keys = [];
      this._onKeyUp = null;
    }
  }

  public zoomIn(): void {
    for (let i = 0; i < 5; i++) {
      // i increase the zoom speed
      setTimeout(() => {
        this._keys.push('+');
        this.checkInputs();
        this._keys = [];
      }, i * 50); // 50ms delay between each iteration
    }
  }

  public zoomOut(): void {
    for (let i = 0; i < 5; i++) {
      // i increase the zoom speed
      setTimeout(() => {
        this._keys.push('-');
        this.checkInputs();
        this._keys = [];
      }, i * 50); // 50ms delay between each iteration
    }
  }

  getSimpleName(): string {
    return 'KeyboardPan';
  }

  getClassName(): string {
    return 'ArcRotateCameraKeyboardPanInput';
  }

  public resetPositionCamera(): void {
    this.detachControl();
    this._keys = [];
    this.camera!.setPosition(
      new Vector3(
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.direction.x,
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.direction.y,
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.direction.z,
      ),
    );
    this.camera!.setTarget(
      new Vector3(
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.target.x,
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.target.y,
        config.arcRotateCameraKeyboardInputs.resetPositionCamera.target.z,
      ),
    );
    this._currentHeightPosition = this.camera!.position.y;
    this._currentHeightTarget = this.camera!.target.y;
    this.attachControl();
  }
}
