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

export default Pawn;