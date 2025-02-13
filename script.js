import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'; 
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap';
import { and, color } from 'three/tsl';
import { CircleGeometry } from 'three';

let chessArray = [
    [-4, -2, -3, -5, -6, -3, -2, -4],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1],
    [4, 0, 3, 5, 6, 3, 2, 4],
];

class ChessSquare {
    constructor(id, x, z, material) {
        this.id = id; 
        this.position = { x, z }; 
        this.center = { x: x - 3.5, z: z - 3.5 }; 
        this.invalid = false;
 
        const geometry = new THREE.PlaneGeometry(1, 1);
        this.squareMesh = new THREE.Mesh(geometry, material);
        this.squareMesh.rotation.x = Math.PI / -2; 
        this.squareMesh.position.set(this.center.x, 0, this.center.z); 

        this.squareMesh.userData.id = id
        this.squareMesh.receiveShadow = true

        scene.add(this.squareMesh); 
    }
}

const scene = new THREE.Scene();
const loader = new RGBELoader()

loader.load('./assets/sky/sky.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture
    scene.background = texture
})

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;  // Zmienione z shadowMapEnabled
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Lepsza jakość cieni
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

const textureLoader = new THREE.TextureLoader()

const blackMaterial = new THREE.MeshStandardMaterial({ 
    metalness: 0.3,
    roughness: 0.8,
    map: textureLoader.load('assets/materials/Marble002/Marble002_2K-PNG_Color.png'),
    normalMap: textureLoader.load('assets/materials/Marble002/Marble002_2K-PNG_NormalGL.png'),
    roughnessMap: textureLoader.load('assets/materials/Marble002/Marble002_2K-PNG_Roughness.png'),
    alphaMap: textureLoader.load('assets/materials/Marble002/Marble002_2K-PNG_Opacity.png'),
    displacementMap: textureLoader.load("assets/materials/Marble002/Marble002_2K-PNG_Displacement.png"),
    displacementScale: 0
  });
  
  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.3,
    roughness: 0.8,
    map: textureLoader.load('assets/materials/Marble001/Marble001_2K-PNG_Color.png'),
    normalMap: textureLoader.load('assets/materials/Marble001/Marble001_2K-PNG_NormalGL.png'),
    roughnessMap: textureLoader.load('assets/materials/Marble001/Marble001_2K-PNG_Roughness.png'),
    alphaMap: textureLoader.load('assets/materials/Marble001/Marble001_2K-PNG_Opacity.png'),
    displacementMap: textureLoader.load("assets/materials/Marble001/Marble001_2K-PNG_Displacement.png"),
    displacementScale: 0
  });

const chessBoard = [];
const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const zajete_miejsca = []

const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4092;  // Wyższa rozdzielczość
directionalLight.shadow.mapSize.height = 4092;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);


const possibleCells = []

function createPossibleMoveCircle(x, z) {
    const possibleMoveGeometry = new THREE.CircleGeometry(0.20, 64);
    const possibleMoveMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const possibleMoveCircle = new THREE.Mesh(possibleMoveGeometry, possibleMoveMaterial);
    possibleMoveCircle.position.set(x - 3.5, 0.01, z - 3.5); // 0.01 to niewielkie przesunięcie w górę, aby okręgi nie nachodziły na płaszczyznę
    possibleMoveCircle.rotation.x = Math.PI / -2; // Obróć okrąg, aby leżał na płaszczyźnie
    return possibleMoveCircle;
}

class Pawn {
    constructor(model_url, position_id, color) {
        this.model_url = model_url;
        this.position_id = position_id;
        this.color = color;
        this.isFirstMove = true;
        this.pawnMesh = null;
        zajete_miejsca.push(this.position_id)
    }

    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.pawnMesh = gltf.scene;
            this.pawnMesh.castShadow = true;
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513; 
            this.pawnMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({ color: color });
                    child.castShadow = true
                    child.userData.parentMesh = this
					child.scale.set(0.2, 0.2, 0.2)
                }
            });
                  
            callback(this.pawnMesh); 
        });
    }

    valid_moves() {
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let moves = [];

        if (this.color == "white") {
            if (this.isFirstMove) {
                moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) - 2}`);
                moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) - 1}`);
            } else {
                if (parseInt(this.position_id[1]) >= 1) {
                    moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) - 1}`);
                } else {
                    console.error("Error: Ten ruch jest niemożliwy");
                }
            }
        } else if (this.color == "black") {
            if (this.isFirstMove) {
                moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) + 2}`);
                moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) + 1}`);
            } else {
                if (parseInt(this.position_id[1]) <= 8) {
                    moves.push(`${this.position_id[0]}${parseInt(this.position_id[1]) + 1}`);
                } else {
                    console.error("Error: Ten ruch jest niemożlowy");
                }
            }
        }

        return moves;
    }

    setPosition(x, z) {
        if (this.pawnMesh) {
            this.pawnMesh.position.set(x - 3.5, -3, z - 3.5); 
        }
    }

    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);
        
        this.highlightValidMoves(validMoves);
        
        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }

}

//WIEŻA
class Rook {
    constructor(model_url, position_id, color) {
        this.model_url = model_url;
        this.position_id = position_id;
        this.color = color;
        this.modelMesh = null;
        zajete_miejsca.push(this.position_id);
    }

    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.modelMesh = gltf.scene;
            this.modelMesh.castShadow = true
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513;
            this.modelMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({ color: color });
                    child.castShadow = true
                    child.scale.set(0.2, 0.2, 0.2);
                    child.userData.parentMesh = this;
                }
            });

            callback(this.modelMesh);
        });
    }

    valid_moves() {
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let moves = [];
        let pos_letter = this.position_id[0];
        let pos_num = parseInt(this.position_id[1]);

        // Move vertically (up and down)
        for (let i = pos_num + 1; i <= 8; i++) {
            let valid_id = `${pos_letter}${i}`;
            if (zajete_miejsca.includes(valid_id)) {
                moves.push(valid_id);
                break;
            }
            moves.push(valid_id);
        }
        for (let i = pos_num - 1; i >= 1; i--) {
            let valid_id = `${pos_letter}${i}`;
            if (zajete_miejsca.includes(valid_id)) {
                moves.push(valid_id);
                break;
            }
            moves.push(valid_id);
        }

        // Move horizontally (left and right)
        let pos_letter_index = letters.indexOf(pos_letter);
        for (let i = pos_letter_index + 1; i < letters.length; i++) {
            let valid_id = `${letters[i]}${pos_num}`;
            if (zajete_miejsca.includes(valid_id)) {
                moves.push(valid_id);
                break;
            }
            moves.push(valid_id);
        }
        for (let i = pos_letter_index - 1; i >= 0; i--) {
            let valid_id = `${letters[i]}${pos_num}`;
            if (zajete_miejsca.includes(valid_id)) {
                moves.push(valid_id);
                break;
            }
            moves.push(valid_id);
        }

        let filtered_array = moves.filter(item => item !== this.position_id);
        return filtered_array;
    }

    setPosition(x, z) {
        if (this.modelMesh) {
            this.modelMesh.position.set(x - 3.5, -3, z - 3.5);
        }
    }

    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);

        this.highlightValidMoves(validMoves);

        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }
}

//KONIK
class Knight {
    constructor(model_url, position_id, color) {
        this.model_url = model_url
        this.position_id = position_id
        this.color = color
        this.knightMesh = null
        zajete_miejsca.push(this.position_id)
    }

    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.knightMesh = gltf.scene;
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513;
            this.knightMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({color: color})
                    child.castShadow = true
                    child.scale.set(0.2, 0.2, 0.2)
                    child.userData.parentMesh = this;  
                }
                callback(this.knightMesh)
            })
        })
    }

    valid_moves() {
        let moves = [];
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
        const knightMoves = [
            {x: 2, y: 1}, {x: 2, y: -1},
            {x: -2, y: 1}, {x: -2, y: -1},
            {x: 1, y: 2}, {x: 1, y: -2},
            {x: -1, y: 2}, {x: -1, y: -2}
        ];
    
        for (let move of knightMoves) {
            let newColumn = letters.indexOf(this.position_id[0]) + move.x;
            let newRow = parseInt(this.position_id[1]) + move.y;
    
            if (newColumn >= 0 && newColumn < letters.length && newRow > 0 && newRow <= 8) {
                if (!zajete_miejsca.includes(`${letters[newColumn]}${newRow}`)) {
                    moves.push(`${letters[newColumn]}${newRow}`);
                }
            }
        }
    
        return moves;
    }

    setPosition(x, z) {
        if (this.knightMesh) {
            this.knightMesh.position.set(x - 3.5, 0, z - 3.5);
        }
    }

    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);
        
        this.highlightValidMoves(validMoves);
        
        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }
}

//GONIEC
class Bishop {
    constructor(model_url, position_id, color) {
        this.model_url = model_url
        this.position_id = position_id
        this.color = color
        this.bishopMesh = null
        zajete_miejsca.push(this.position_id)
    }
    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.bishopMesh = gltf.scene;
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513;
            this.bishopMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({color: color})
                    child.castShadow = true
                    child.scale.set(0.2, 0.2, 0.2)
                    child.userData.parentMesh = this; 
                }
                callback(this.bishopMesh)
            })
        })
    }

    valid_moves() {
        let moves = [];
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
        let currentColumn = letters.indexOf(this.position_id[0]);
        let currentRow = parseInt(this.position_id[1]);
    
        const directions = [
            {col: -1, row: 1}, 
            {col: 1, row: 1},  
            {col: -1, row: -1},
            {col: 1, row: -1} 
        ];
    
        for (let direction of directions) {
            let newColumn = currentColumn;
            let newRow = currentRow;
    
            while (true) {
                newColumn += direction.col;
                newRow += direction.row;
    
           
                if (newColumn >= 0 && newColumn < letters.length && newRow > 0 && newRow <= 8) {
                    moves.push(`${letters[newColumn]}${newRow}`);
                } else {
                    break; 
                }
            }
        }
    
        return moves;
    }

    setPosition(x, z) {
        if (this.bishopMesh) {
            this.bishopMesh.position.set(x - 3.5, -5.4, z - 3.5);
        }
    }

    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);
        
        this.highlightValidMoves(validMoves);
        
        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }

}

//KRÓLOWA
class Queen {
    constructor(model_url, position_id, color) {
        this.model_url = model_url
        this.position_id = position_id
        this.color = color
        this.queenMesh = null
        zajete_miejsca.push(this.position_id)
    }
    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.queenMesh = gltf.scene;
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513;
            this.queenMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({color: color})
                    child.castShadow = true
                    child.scale.set(0.2, 0.2, 0.2)
                    child.userData.parentMesh = this; 
                }
                callback(this.queenMesh)
            })
        })
    }

    setPosition(x, z) {
        if (this.queenMesh) {
            this.queenMesh.position.set(x - 3.5, -5.25, z - 3.5);
        }
    }

    valid_moves() {
        let moves = [];
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        let currentColumn = letters.indexOf(this.position_id[0]);
        let currentRow = parseInt(this.position_id[1]);

        const directions = [
            { col: -1, row: 0 }, 
            { col: 1, row: 0 },  
            { col: 0, row: 1 },  
            { col: 0, row: -1 },  
            { col: -1, row: 1 }, 
            { col: 1, row: 1 },   
            { col: -1, row: -1 },  
            { col: 1, row: -1 }   
        ];

        for (let direction of directions) {
            let newColumn = currentColumn;
            let newRow = currentRow;

            while (true) {
                newColumn += direction.col;
                newRow += direction.row;

                if (newColumn >= 0 && newColumn < letters.length && newRow > 0 && newRow <= 8) {
                    if (!zajete_miejsca.includes(`${letters[newColumn]}${newRow}`)) {
                        moves.push(`${letters[newColumn]}${newRow}`);
                    }
                    else {
                        break;
                    }
                    
                } else {
                    break; 
                }
            }
        }

        return moves;
    }

    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);
        
        this.highlightValidMoves(validMoves);
        
        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }
}

//KRÓL
class King {
    constructor(model_url, position_id, color) {
        this.model_url = model_url
        this.position_id = position_id
        this.color = color
        this.kingMesh = null
        zajete_miejsca.push(this.position_id)
    }
    loadModel(callback) {
        const loader = new GLTFLoader();
        loader.load(this.model_url, (gltf) => {
            this.kingMesh = gltf.scene;
            const color = this.color === 'white' ? 0xd2b48c : 0x8b4513;
            this.kingMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({color: color})
                    child.castShadow = true
                    child.scale.set(0.2, 0.2, 0.2)
                    child.userData.parentMesh = this; 
                }
                callback(this.kingMesh)
            })
        })
    }

    setPosition(x, z) {
        if (this.kingMesh) {
            this.kingMesh.position.set(x - 3.5, -7.75, z - 3.5);
        }
    }

    valid_moves() {
        let moves = [];
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        let currentColumn = letters.indexOf(this.position_id[0]);
        let currentRow = parseInt(this.position_id[1]);

        const directions = [
            { col: -1, row: 1 },   
            { col: 0, row: 1 },   
            { col: 1, row: 1 },   
            { col: 1, row: 0 },    
            { col: 1, row: -1 },   
            { col: 0, row: -1 },   
            { col: -1, row: -1 },  
            { col: -1, row: 0 }    
        ];

        for (let direction of directions) {
            let newColumn = currentColumn + direction.col;
            let newRow = currentRow + direction.row;

            if (newColumn >= 0 && newColumn < letters.length && newRow > 0 && newRow <= 8) {
                moves.push(`${letters[newColumn]}${newRow}`);
            }
        }

        return moves;
    }
    
    onMouseClick() {
        const validMoves = this.valid_moves();
        console.log('Kliknięto pionka:', this.position_id);
        console.log('Możliwe ruchy pionka:', validMoves);
        
        this.highlightValidMoves(validMoves);
        
        return validMoves;
    }

    highlightValidMoves(validMoves) {
        // Usuń poprzednie okręgi
        possibleCells.forEach(cell => {
            if (cell.possibleMoveCircle) {
                scene.remove(cell.possibleMoveCircle);
            }
        });
        possibleCells.length = 0; // Wyczyść tablicę
    
        // Dodaj nowe okręgi dla możliwych ruchów
        validMoves.forEach(move => {
            const square = chessBoard.find(s => s.squareMesh.userData.id === move);
            if (square) {
                const possibleMoveCircle = createPossibleMoveCircle(square.position.x, square.position.z);
                square.possibleMoveCircle = possibleMoveCircle; // Zapisz referencję do okręgu
                scene.add(possibleMoveCircle);
                possibleCells.push(square);
            }
        });
    }

}

let pawn = new Pawn("", "e5", "white");
console.log(pawn.valid_moves());

let blackPawn = new Pawn("", "h4", "black");
console.log(blackPawn.valid_moves());

let rook = new Rook('model', 'd5', 'white');
console.log(rook.valid_moves())


for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
        const id = `${fileLabels[x]}${z + 1}`; 
        const isBlack = (x + z) % 2 === 0; 
        const material = isBlack ? blackMaterial : whiteMaterial;

        const square = new ChessSquare(id, x, z, material);
        chessBoard.push(square); 
    }
}


const pawnModels = [];

function addPawnsToBoard() {
    const pawn_model_url = './assets/pawns/pawn/scene.gltf'; 
    const rook_model_url = './assets/pawns/rook/scene.gltf';
    const knight_model_url = './assets/pawns/knight/scene.gltf'
    const queen_model_url = './assets/pawns/queen/scene.gltf';
    const bishop_model_url = './assets/pawns/bishop/scene.gltf'
    const king_model_url = './assets/pawns/king/scene.gltf'

    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const piece = chessArray[z][x];

            if (piece == 1 || piece == -1) {
                const color = piece > 0 ? 'white' : 'black';
                const pawn = new Pawn(pawn_model_url, `${fileLabels[x]}${z + 1}`, color);
                pawn.loadModel((mesh) => {
                    pawn.setPosition(x, z);
                    pawn.castShadow = true;
                    scene.add(mesh);
                    mesh.userData.parentMesh = pawn;
                    pawnModels.push(mesh); 
                });
            }

            if (piece == 2 || piece == -2) {
                const color = piece > 0 ? 'white' : 'black';
                const knight = new Knight(knight_model_url, `${fileLabels[x]}${z + 1}`, color);
                knight.loadModel((mesh) => {
                    knight.setPosition(x, z);
                    scene.add(mesh);
                    mesh.userData.parentMesh = knight;
                    pawnModels.push(mesh); 
                });
            } 

            if (piece == 4 || piece == -4) {
                const color = piece > 0 ? 'white' : 'black';
                const rook = new Rook(rook_model_url, `${fileLabels[x]}${z + 1}`, color);
                rook.loadModel((mesh) => {
                    rook.setPosition(x, z);
                    scene.add(mesh);
                    mesh.userData.parentMesh = rook;
                    pawnModels.push(mesh); 
                });
            }

            if (piece == 5 || piece == -5) {
                const color = piece > 0 ? 'white' : 'black';
                const queen = new Queen(queen_model_url, `${fileLabels[x]}${z + 1}`, color);
                queen.loadModel((mesh) => {
                    queen.setPosition(x, z);
                    scene.add(mesh);
                    mesh.userData.parentMesh = queen;
                    pawnModels.push(mesh); 
                });
            }

            if (piece == 3 || piece == -3) {
                const color = piece > 0 ? 'white' : 'black';
                const bishop = new Bishop(bishop_model_url, `${fileLabels[x]}${z + 1}`, color);
                bishop.loadModel((mesh) => {
                    bishop.setPosition(x, z);
                    scene.add(mesh);
                    mesh.userData.parentMesh = bishop;
                    pawnModels.push(mesh); 
                });
            }

            if (piece == 6 || piece == -6) {
                const color = piece > 0 ? 'white' : 'black';
                const king = new King(king_model_url, `${fileLabels[x]}${z + 1}`, color);
                king.loadModel((mesh) => {
                    king.setPosition(x, z);
                    scene.add(mesh);
                    mesh.userData.parentMesh = king;
                    pawnModels.push(mesh); 
                });
            }
        }
    }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedPawn = null;
let previousPosition = null;

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(pawnModels);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const selectedPiece = clickedObject.userData.parentMesh;

        console.log('Kliknięto obiekt:', clickedObject);
        console.log('selectedPiece:', selectedPiece);

        if (selectedPiece && typeof selectedPiece.onMouseClick === 'function') {
            const possibleMoves = selectedPiece.onMouseClick();
        } else {
            console.error("Error: Kliknięty obiekt nie jest figurą lub nie ma metody onMouseClick");
            selectedPawn = null
        }

        if (selectedPawn) {
            gsap.to(selectedPawn.position, { z: previousPosition.z, duration: 0.5 });
        }

        previousPosition = { ...clickedObject.position };
        gsap.to(clickedObject.position, { z: clickedObject.position.z + 1, duration: 0.5 });
        selectedPawn = clickedObject;
    }
});

addPawnsToBoard();

let center = new THREE.Vector3(1, 0, 1);
let radius = 10; 
let angleDegrees = 90; 
let isWhiteTurn = true;
let tiltAngleDegrees = 30; 

// Funkcja do obrotu kamery
function rotateCamera() {
    // Zmiana kierunku obrotu
    let targetAngleDegrees = angleDegrees + 180;
    let currentAngleDegrees = angleDegrees; // Aktualny kąt

    // Funkcja do aktualizacji pozycji kamery
    function updateCameraPosition() {
        if (Math.abs(currentAngleDegrees - targetAngleDegrees) > 1) {
            let radians = (currentAngleDegrees * Math.PI) / 180;
            let x = center.x + radius * Math.cos(radians);
            let z = center.z + radius * Math.sin(radians);
            
            // Ustawienie pozycji kamery
            camera.position.set(x, camera.position.y, z);

            // Ustawienie nachylenia kamery o 30 stopni w dół
            let tiltRadians = (tiltAngleDegrees * Math.PI) / 180;
            let tiltY = radius * Math.sin(tiltRadians);
            let tiltX = radius * Math.cos(tiltRadians);

            // Ustawienie kierunku kamery
            camera.lookAt(new THREE.Vector3(center.x, tiltY, center.z));

            // Zwiększanie lub zmniejszanie aktualnego kąta dla płynnego przejścia
            if (targetAngleDegrees > angleDegrees) {
                currentAngleDegrees += 2;
            } else {
                currentAngleDegrees -= 2;
            }

            // Wywołanie ponowne funkcji w następnym cyklu animacji
            requestAnimationFrame(updateCameraPosition);
        } else {
            angleDegrees = targetAngleDegrees;
            isWhiteTurn = !isWhiteTurn;
        }
    }

    // Rozpoczęcie animacji
    updateCameraPosition();
}

rotateCamera()
// Nasłuchiwanie na naciśnięcie klawisza "r"
window.addEventListener("keydown", (e) => {
    if (e.key === "r") {
        rotateCamera();
    }
});
camera.position.set(5, 5, 5);
controls.update();


function animate() {
    controls.update(); 
    renderer.render(scene, camera)
    requestAnimationFrame(animate);

}
animate();
