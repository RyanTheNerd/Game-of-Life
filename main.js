class Cell {
  constructor(x, y) {
    this.state = {
      alive: false,
      neighborCount: 0,
    }
    this.position = [x, y];
    this.neighbors = [];
    this.aliveFrames = 0;
    this.nextState = {};
  }
  setAlive(state) {
    this.nextState.alive = state;
  }
  tick() {  // Determine if cell will be alive in next tick of the game
    this.updateNeighborCount();

    if(this.state.alive) this.handleAlive();

    else if(this.state.neighborCount == 3) this.setAlive(true);

  }
  handleAlive() {
    // Underpopulation
      if(this.state.neighborCount < 2) this.setAlive(false);

    // Good population
      else if(this.state.neighborCount < 4) this.setAlive(true);

    // Overpopulation
      else this.setAlive(false);

  }
  useNextState() {
    Object.assign(this.state, this.nextState);
    this.nextState = {alive: false};
    if(this.state.alive == false) this.aliveFrames = 0;
    else if( this.state.alive && 
       this.aliveFrames < 12
       ) this.aliveFrames++;
  }
  updateNeighborCount() {
    this.state.neighborCount = 0;
    for(let neighbor of this.neighbors) {
      if(neighbor.state.alive) {
        this.state.neighborCount++;
      }
    }
  }
}

class CellMatrix {
  constructor(width, height) {
    this.matrix = [];
    this.cells = [];
    this.width = width;
    this.height = height;
    this.aliveCount = 0;
    
    // Populate matrix with cells
    for(let y = 0; y < this.height; y++) {
      this.matrix.push([]); 
      for(let x = 0; x < this.width; x++) {
        let cell = new Cell(x, y);
        this.matrix[y].push(cell); 
        this.cells.push(cell);
      }
    }
    this.addSeed();
    
    // Inform the cells of their neighbors
    this.cells.forEach((cell)=> {
      let neighborCells = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ];
      for(let neighbor of neighborCells) {
        let x = cell.position[0] + neighbor[0];
        let y = cell.position[1] + neighbor[1];
        if(x > -1 && y > -1 && x < this.width && y < this.height) {
          cell.neighbors.push(this.matrix[y][x]);
        }
      }
    });
    
  }
  tick() {
    this.aliveCount = 0;
    this.cells.forEach((cell) => {
      if(cell.state.alive) {
        this.aliveCount++;
      }
      cell.useNextState();
    });
    this.cells.forEach((cell) => cell.tick());
  }
  addSeed() {
    this.cells.forEach((cell) => {
      cell.nextState.alive = Math.random() > 0.5;
      cell.aliveFrames = 0;
    });
  }
}

class MatrixViewPort {
  constructor(canvas, cellMatrix, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.cellMatrix = cellMatrix;
    this.resize();
  }
  draw(timePassed) {
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0,this.canvas.width, this.canvas.height);

    let cellState;
    this.cellMatrix.cells.forEach((cell) => {
      // fade out
      if(cell.nextState.alive == false && cell.state.alive == true) {
        this.ctx.globalAlpha = 1 - timePassed;
        cellState = "dying";
      }
      // fade in
      else if(cell.nextState.alive == true && cell.state.alive == false) {
        this.ctx.globalAlpha = timePassed;
        cellState = "reviving";
      }
      // alive
      else if(cell.nextState.alive == true && cell.state.alive == true) {
        this.ctx.globalAlpha = 1;
        cellState = "alive";
      }
      else return;

      let colorVal;
      if(cellState == "reviving") {
        colorVal = timePassed;
      }
      else if(cellState == "dying") {
        colorVal = 1 - timePassed;
      }
      else {
        colorVal = 1;
      }
      let hue = 240 - ((cell.aliveFrames * (360 / 12)) + (timePassed * (360 / 12))) * 2 / 3;
      this.ctx.fillStyle = `hsl(${hue}, ${colorVal * 100}%, ${colorVal * 50}%)`;
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
    this.cellMatrix.cells.forEach((cell) => {
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

    this.speed = 2;
    this.currentFrame = 0;
    this.timePassed = 0;
    this.matrix = new CellMatrix(this.width, this.height);
    this.viewPort = new MatrixViewPort(this.canvas, this.matrix, this.width, this.height);
    window.addEventListener('resize', () => this.viewPort.resize());
    this.canvas.addEventListener('click', function() {this.matrix.addSeed()}.bind(this));
    
    window.addEventListener('wheel', (ev) => {
      if(ev.deltaY > 0 && this.speed < 100) this.speed += 0.1;
      else if(ev.deltaY < 0 && this.speed > 0) this.speed -= 0.1;
    });
  }
  tick() {
    this.timePassed += this.speed / 100;
    this.currentFrame = Math.floor(this.timePassed);
    this.timePassed %= 1;
    if(this.currentFrame == 1) {
      this.matrix.tick();
    }
    this.viewPort.draw(this.timePassed);
    window.requestAnimationFrame(this.tick.bind(this));
  }
  
}

let gameOfLife = new GameOfLife(8);
gameOfLife.tick();