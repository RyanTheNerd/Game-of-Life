class Cell {
  constructor(x, y) {
    this.position = [x, y];
    this.state = {
      alive: false,
      neighbors: [],
      neighborCount: 0,
    }
    this.aliveFrames = 0;
    this.nextState = {};
  }
  tick() {  // Determine if cell will be alive in next tick of the game
    this.updateNeighborCount();

    if(this.state.alive) this.handleAlive();

    else if(this.state.neighborCount == 3) this.nextState.alive = true;
    if(this.state.alive && 
       this.nextState.alive && 
       this.aliveFrames < 12
       ) this.aliveFrames++;
  }
  handleAlive() {
    // Underpopulation
      if(this.state.neighborCount < 2) this.nextState.alive = false;

    // Good population
      else if(this.state.neighborCount < 4) this.nextState.alive = true;

    // Overpopulation
      else this.nextState.alive = false;

  }
  useNextState() {
    Object.assign(this.state, this.nextState);
    this.nextState = {};
  }
  updateNeighborCount() {
    this.state.neighborCount = 0;
    for(let neighbor of this.state.neighbors) {
      if(neighbor.state.alive) {
        this.state.neighborCount++;
      }
    }
  }
}

class CellMatrix {
  constructor(width, height) {
    this.cells = [];
    this.width = width;
    this.height = height;
    this.aliveCount = 0;
    this.entropy = 0;
    this.averageEntropy = null;
    
    // Populate matrix with cells
    for(let y = 0; y < this.height; y++) {
      this.cells.push([]); 
      for(let x = 0; x < this.width; x++) {
        this.cells[y].push(new Cell(x, y)); 
      }
    }
    this.addSeed();
    
    // Inform the cells of their neighbors
    this.forEachCell((cell)=> {
      let neighborCells = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ];
      for(let neighbor of neighborCells) {
        let x = cell.position[0] + neighbor[0];
        let y = cell.position[1] + neighbor[1];
        if(x > -1 && y > -1 && x < this.width && y < this.height) {
          cell.state.neighbors.push(this.cells[y][x]);
        }
      }
    });
    
  }
  forEachCell(func) {
    for(let y = 0; y < this.height; y++) {
      for(let x = 0; x < this.width; x++) {
        func(this.cells[y][x]);
      }
    }
    
  }
  tick() {
    this.entropy = 0;
    this.aliveCount = 0;
    this.forEachCell((cell) => cell.tick());
    this.forEachCell((cell) => {
      cell.useNextState();
      this.entropy += cell.aliveFrames;
      if(cell.state.alive) {
        this.aliveCount++;
      }
    });
    this.averageEntropy = this.entropy / this.aliveCount;
  }
  addSeed() {
    this.forEachCell((cell) => {
      cell.state.alive = Math.random() > 0.5;
    });
  }
}

class MatrixViewPort {
  constructor(canvas, cellMatrix, width, height) {
    this.colorCode = [...Array(8).keys()].reverse().map((i) => {
      return `hsl(${Math.floor(Math.random() * 360)}, ${i/8 * 100}%, ${Math.floor(i/8 * 100)}%)`;
    });
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.resize();
    this.cellMatrix = cellMatrix;
    window.addEventListener('resize', this.resize.bind(this));
  }
  draw() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0,this.canvas.width, this.canvas.height);
    this.cellMatrix.forEachCell((cell) => {
      if(cell.state.alive == false) {
        return;
      }
      this.ctx.fillStyle = this.colorCode[cell.aliveFrames > this.colorCode.length ? this.colorCode.length - 1 : cell.aliveFrames];
      let x = cell.position[0] * this.cellWidth;
      let y = cell.position[1] * this.cellHeight;
      this.ctx.fillRect(x, y, this.cellWidth, this.cellHeight); 
    });
  }
  resize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    let ratio = this.width / this.height;
    if(height > width) {
      this.canvas.width = width;
      this.canvas.height = width * ratio;
    }
    else {
      this.canvas.height = height;
      this.canvas.width = height * ratio;
    }
    this.cellWidth = this.canvas.width / this.width;
    this.cellHeight = this.cellWidth;
  }
}

class RadialViewPort extends MatrixViewPort {
  constructor(canvas, cellMatrix, width, height, zoom) {
    super(canvas, cellMatrix, width, height);
    this.zoom = zoom;
  }
  draw() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0,this.canvas.width, this.canvas.height);
    this.cellMatrix.forEachCell((cell) => {
      if(cell.state.alive == false) {
        return;
      }
      this.ctx.strokeStyle = this.colorCode[cell.aliveFrames > this.colorCode.length ? this.colorCode.length - 1 : cell.aliveFrames];
      let x = cell.position[0];
      let y = cell.position[1];
      this.ctx.beginPath();
      this.ctx.arc(this.canvas.width/2, this.canvas.height/2, x*this.zoom, y, y + (2*Math.PI)/this.width); 
      this.ctx.stroke();
    });
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
}


class GameOfLife {
  constructor(cellSize) {
    this.width = Math.floor(window.innerWidth / cellSize);
    this.height = Math.floor(window.innerHeight / cellSize);

    // Canvas stuff
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);
    this.canvas.addEventListener('click', function() {this.matrix.addSeed()}.bind(this));
    document.body.addEventListener('keydown', function(e) {
      if(e.code == "ArrowUp" && this.skippedFrames > 0) {
        this.skippedFrames--;
      }
      else if(e.code == "ArrowDown" && this.skippedFrames < 10) {
        this.skippedFrames++;
      }
      this.currentFrame = 0;
    }.bind(this));

    this.skippedFrames = 5;
    this.currentFrame = 0;

    this.matrix = new CellMatrix(this.width, this.height);
    this.viewPort = new MatrixViewPort(this.canvas, this.matrix, this.width, this.height);
  }
  tick() {
    if(this.skippedFrames == this.currentFrame) {
      this.matrix.tick();
      this.viewPort.draw();
      this.currentFrame = 0;
    }
    else {
      this.currentFrame++;
    }
    window.requestAnimationFrame(this.tick.bind(this));
  }
  
}

let gameOfLife = new GameOfLife(8);
gameOfLife.tick();