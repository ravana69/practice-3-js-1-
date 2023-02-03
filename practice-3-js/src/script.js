import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';

// vertex shader source
const vertexParticleShader = `
uniform float uTime;
uniform float uTimeScale;
uniform float uNumber;

varying vec3 vPos;

float PI = 3.14159265359;
float radian = 0.017453292519944;

attribute float number;

void main(){
  vec3 pos = position;
  
  float r = (radian * pos.z) * 0.05;
  pos.x = cos(radian * pos.z * abs(uNumber - uTime * uTimeScale)) * r;
  pos.y = sin(radian * pos.z * abs(uNumber - uTime * uTimeScale)) * r;
  
  pos.z = sin(length(pos.xy) - uTime) * 3.0;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  vPos = pos;
  
  //gl_PointSize = 10.0 * (20.0 / - mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}

`;

// fragment shader source
const fragmentParticleShader = `
uniform float uTime;

varying vec3 vPos;

// Referred to https://iquilezles.org/www/articles/palettes/palettes.htm
// Thank you so much.
vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
  return a + b*cos( 6.28318*(c*t+d) );
}

void main () {
  //float f = length(gl_PointCoord - vec2(0.5, 0.5));
  
  //if (f > 0.1) discard;
  
  float len = length(vPos) * 2.0;
  
  vec3 color =
    pal(
      length(len - uTime * 0.5),
      vec3(0.5,0.5,0.5),
      vec3(0.5,0.5,0.5),
      vec3(1.0,1.0,1.0),
      vec3(0.0,0.10,0.20)
    );
  
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Dat class
 */
class Dat {
  constructor(sketch) {
    this.sketch = sketch;
  
    this.initialize();
  }
  
  initialize() {
    this.gui = new dat.GUI();
    this.parameters = this.setParameters();
    this.controller = this.setController();
    this.gui.close();
  }
  
  setParameters() {
    let parameters;
  
    parameters = {
      number: 6000,
      uTimeScale: 0.001,
      uNumber: 120.0
    };

    return parameters;
  }
  
  setController() {
    let controller;
  
    controller = {
      number: this.gui.add(this.parameters, 'number', 100, 300000, 100)
        .onChange(() => this.sketch.initialize()),
      
      uTimeScale: this.gui.add(this.parameters, 'uTimeScale', 0.0001, 1.0, 0.0001)
        .onChange(() => this.sketch.initialize()),
      
      uNumber: this.gui.add(this.parameters, 'uNumber', 0.0, 360.0, 30.0)
        .onChange(() => this.sketch.initialize())
    };

    return controller;
  }
}

/**
 * Mouse class
 */
class Mouse {
  constructor(sketch) {
    this.sketch = sketch;

    this.initialize();
  }
  
  initialize() {
    this.mouse = new THREE.Vector3();
    this.touchStart = new THREE.Vector3();
    this.touchMove = new THREE.Vector3();
    this.touchEnd = new THREE.Vector3();
    
    this.delta = 1;
    
    this.setupEvents();
  }
  
  setupEvents() {
    this.sketch.renderer.domElement.addEventListener('mousemove', this.onMousemove.bind(this), false);
    this.sketch.renderer.domElement.addEventListener('touchstart', this.onTouchstart.bind(this), false);
    this.sketch.renderer.domElement.addEventListener('touchmove', this.onTouchmove.bind(this), false);
    this.sketch.renderer.domElement.addEventListener('touchend', this.onTouchend.bind(this), false);
    this.sketch.renderer.domElement.addEventListener('onWheel', this.onWheel.bind(this), false);
  }
  
  onMousemove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.z = 0;
  }
  
  onTouchstart(e) {
    const touch = e.targetTouches[0];
  
    this.touchStart.x = touch.pageX;
    this.touchStart.y = touch.pageY;
    this.touchStart.z = 0.0;

    this.mouse.x = (touch.pageX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.pageY / window.innerHeight) * 2 + 1;
    this.mouse.z = 0;
  }
  
  onTouchmove(e) {
    const touch = e.targetTouches[0];

    this.touchMove.x = touch.pageX;
    this.touchMove.y = touch.pageY;
    this.touchMove.z = 0.0;

    this.touchEnd.x = this.touchStart.x - this.touchMove.x;
    this.touchEnd.y = this.touchStart.y - this.touchMove.y;
    this.touchEnd.z = 0.0;

    this.mouse.x = (touch.pageX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.pageY / window.innerHeight) * 2 + 1;
    this.mouse.z = 0;
    
    if (this.touchMove.y < this.touchStart.y) {
      this.delta += (this.touchEnd.y - this.touchStart.y) * 0.0001;
    } else {
      this.delta -= (this.touchEnd.y - this.touchStart.y) * 0.0001;
    }
  }
  
  onTouchend(e) {
    this.touchStart.x = null;
    this.touchStart.y = null;
    this.touchStart.z = null;

    this.touchMove.x = null;
    this.touchMove.y = null;
    this.touchMove.z = null;

    this.touchEnd.x = null;
    this.touchEnd.y = null;
    this.touchEnd.z = null;
  }
  
  onWheel(e) {
    this.delta -= e.deltaY * 0.01;
  }
}

/**
 * class Sketch
 */
class Sketch {
  constructor() {
    this.createCanvas();
    this.setupEvents();
    //this.setupStats();
    
    this.time = new THREE.Clock(true);
    this.mouse = new Mouse(this);
    this.dat = new Dat(this);
    
    this.initialize();
  }
  
  createCanvas() {
    this.renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
    
    document.getElementById('container').
      appendChild(this.renderer.domElement);
  }
  
  setupStats() {
    this.stats = new Stats();
    this.stats.setMode(0);
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '0';
    this.stats.domElement.style.top = '0';
    
    document.getElementById('container').
      appendChild(this.stats.domElement);
  }
  
  initialize() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.width = Math.ceil(window.innerWidth);
    this.height = Math.ceil(window.innerHeight);

    this.scene = new THREE.Scene();
    
    this.setupCanvas();
    this.setupCamera();
    this.setupLight();
    this.setupShape();
    
    this.draw();
  }
  
  setupCanvas() {
    this.renderer.setSize(this.width, this.height);
    //this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setPixelRatio(1.0);
    this.renderer.setClearColor(0x000000, 1.0);
    
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';
    this.renderer.domElement.style.outline = 'none';
  }
  
  setupCamera() {
    const fov = 70;
    const fovRadian = (fov / 2) * (Math.PI / 180);
    
    this.dist = this.height / 2 / Math.tan(fovRadian);
    
    this.camera =
      new THREE.PerspectiveCamera(
        fov,
        this.width / this.height,
        0.01,
        this.dist * 5
      );
    
    this.camera.position.set(0, 0, this.dist * 0.008);
    this.camera.lookAt(new THREE.Vector3());
    
    this.scene.add(this.camera);
    
    //this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }
  
  updateCamera(time) {
    this.camera.position.set(
      Math.cos(-time * 0.1) * this.dist,
      Math.sin( time * 0.1) * this.dist,
      Math.sin(-time * 0.1) * this.dist
    );
    this.camera.lookAt(new THREE.Vector3());
  }
  
  setupLight() {
    // directinal light
    this.directionalLight = new THREE.DirectionalLight(0xffffff);
    this.scene.add(this.directionalLight);

    // point light
    this.spotLight = new THREE.SpotLight(0xffffff);
    this.spotLight.position.set(this.dist, this.dist, this.dist);
    this.scene.add(this.spotLight);
  }
  
  setupShape() {
    this.shapes = new Array();
    const s = new Shape(this);
    this.shapes.push(s);
  }
  
  draw() {
    //this.stats.begin();
    
    const time = this.time.getElapsedTime();
    
    for (let i = 0; i < this.shapes.length; i++) {
      this.shapes[i].render(time);
    }
    
    this.renderer.render(this.scene, this.camera);
    
    //this.stats.end();
    this.animationId = requestAnimationFrame(this.draw.bind(this));
  }
  
  setupEvents() {
    window.addEventListener('resize', this.onResize.bind(this), false);
  }
  
  onResize() {
    this.initialize();
  }
}

/**
 * shape class
 */
class Shape {
  /**
   * @constructor
   * @param {object} sketch - canvas
   */
  constructor(sketch) {
    this.sketch = sketch;
    
    this.initialize();
  }
  
  /**
   * initialize shape
   */
  initialize() {
    this.number = this.sketch.dat.parameters.number;
    this.particleGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.number * 3);
    this.numbers = new Float32Array(this.number);
    
    for (let i = 0; i < this.number; i++) {
      const x = 0;
      const y = 0;
      const z = i;
      
      this.positions.set([x, y, z], i * 3);
    }
    
    for (let i = 0; i < this.number; i++) {
      const n = Math.random() * 2 - 1;
      this.numbers.set([n], i);
    }
    
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('number', new THREE.BufferAttribute(this.numbers, 1));
    
    this.particleMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTime: {type: 'f', value: 0},
        uTimeScale: {type: 'f', value: 1},
        uNumber: {type: 'f', value: 120.0},
        uResolution: {
          type: 'v2',
          value: new THREE.Vector2(this.sketch.width, this.sketch.height)
        }
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      vertexShader: vertexParticleShader,
      fragmentShader: fragmentParticleShader
    });
    
    this.particlePoint = new THREE.Line(this.particleGeometry, this.particleMaterial);
    //this.particlePoint.rotation.x = -90 * Math.PI / 180;
    this.sketch.scene.add(this.particlePoint);
  }
  
  updateParameters(time) {
    this.particlePoint.material.uniforms.uTime.value = time;
    this.particlePoint.material.uniforms.uTimeScale.value = this.sketch.dat.parameters.uTimeScale;
    this.particlePoint.material.uniforms.uNumber.value = this.sketch.dat.parameters.uNumber;
  }
  
  /**
   * render shape
   * @param {number} time - time 
   */
  render(time) {
    this.updateParameters(time);
  }
}

(() => {
  window.addEventListener('load', () => {
    console.clear();

    const loading = document.getElementById('loading');
    loading.classList.add('loaded');

    new Sketch();
  });
})();