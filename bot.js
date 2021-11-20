"use strict"
const Board=require('./pilkarzykiRenderer.js')
const process = require('process')
const { performance } = require('perf_hooks')
const PriorityQueue = require('js-priority-queue')
const config = require('./config.json')

var evalFunction = require('./evaluation.js')

var directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
// var DEBUG = false

module.exports=class ExtBoard {
	constructor(board, size_hor, size_ver) {
		this.ball = [board.ball.x, board.ball.y]
		this.graph = new Array(size_ver)
		this.size_ver = size_ver
		this.size_hor = size_hor
		for (var x = 0; x < size_ver; ++x) {
			this.graph[x] = new Array(size_hor)
			for (var y = 0; y < size_hor; ++y)
				this.graph[x][y] = new Array(8)
		}
		for (var x = 1; x < size_ver-1; ++x) {
			for (var y = 1; y < size_hor-1; ++y) {
				for (var i = 0; i < 8; ++i)
					this.graph[x][y][i] = true
				for (var i of board.possibleMovesIndexes(x, y))
					this.graph[x][y][i] = false
			}
		}
		// possibly not necessary
		this.graph[1][3] = [true, true, true, true, true, true, true, true]
		this.graph[1][4] = [true, true, true, true, true, true, true, true]
		this.graph[1][5] = [true, true, true, true, true, true, true, true]

		this.graph[11][3] = [true, true, true, true, true, true, true, true]
		this.graph[11][4] = [true, true, true, true, true, true, true, true]
		this.graph[11][5] = [true, true, true, true, true, true, true, true]

		this.vis = new Array(size_ver)
		for (var x = 0; x < size_ver; ++x)
			this.vis[x] = new Array(size_hor)

		this.turn = board.turn
	}
	
	createArray(a, b = 1, c = 1, defaultVal = 0) {
		var res = Array(a)
		if (b > 1) {
			for (var i = 0; i < a; ++i) {
				res[i] = Array(b)
				if (c > 1) {
					for (var j = 0; j < b; ++j) {
						res[i][j] = Array(c);
						for (var k = 0; k < c; ++k) {
							res[i][j][k] = defaultVal
						}
					}
				} else {
					for (var j = 0; j < b; ++j) {
						res[i][j] = defaultVal
					}
				}
			}
		} else {
			for (var i = 0; i < a; ++i) {
				res[i] = defaultVal
			}
		}
		return res
	}

	moved(point, i) {
		return [point[0] + directions[i][0], point[1] + directions[i][1]]
	}

	possibleDirections(point) {
		var res = []
		for (var i = 0; i < 8; ++i) {
			if (this.graph[point[0]][point[1]][i] === false)
				res.push(i)
		}
		return res
	}

	makeMove(move) {
		for (const dir of move) {
			if (this.graph[this.ball[0]][this.ball[1]][dir]) {
				console.log("OH NO: there is already edge %o --- %o", this.ball, this.moved(this.ball, dir))
			}
			this.graph[this.ball[0]][this.ball[1]][dir] = true
			this.ball = this.moved(this.ball, dir)
			this.graph[this.ball[0]][this.ball[1]][7 - dir] = true
		}
		this.turn = 1 - this.turn
	}

	unmakeMove(move) {
		for (const dir of move.reverse()) {
			if (!this.graph[this.ball[0]][this.ball[1]][7 - dir]) {
				console.log("OH NO: there was no edge %o --- %o", this.ball, this.moved(this.ball, 7 - dir))
			}
			this.graph[this.ball[0]][this.ball[1]][7 - dir] = false
			this.ball = this.moved(this.ball, 7 - dir)
			this.graph[this.ball[0]][this.ball[1]][dir] = false
		}
		move.reverse()
		this.turn = 1 - this.turn
	}

	single(s, t, canGoFurther) {
		if (s[0] == t[0] && s[1] == t[1])
			return [[evalFunction(this.ball), []]]

		if (s[0] == 1 || s[0] == 11)
		{
			if (t[0] == 1 || t[0] == 11)
				return [[evalFunction(this.ball), []]]
			return null
		}

		// this.vis[s[0]][s[1]] = true
		// if (DEBUG) console.log(s)

		var queue = new PriorityQueue({ comparator: function(a,b) {
			return a[0] - b[0]
		} })

		if (canGoFurther) {
			// if (DEBUG) console.log(s + ": " + this.possibleDirections(s))
			for (var i of this.possibleDirections(s)) {

				var v = this.moved(s, i)
				// if (DEBUG) console.log(s, i, directions[i])
				// if (DEBUG) console.log(s + " -> " + v)
				// if (this.vis[v[0]][v[1]]) {
				// 	if (DEBUG) console.log("visited " + v)
				// 	continue
				// }

				canGoFurther = false
				for (var j = 0; j < 8; ++j) {
					if (this.graph[v[0]][v[1]][j]) {
						canGoFurther = true
						break
					}
				}
				// if (DEBUG) console.log(v + ' ' + canGoFurther)
				this.makeMove([i])

				var path = this.single(v, t, canGoFurther)
				this.unmakeMove([i])
				if (path !== null) {
					for (var tmp_path of path) {
						if (tmp_path === null)
							continue
						
						queue.queue([tmp_path[0], [i].concat(tmp_path[1])])
						if (queue.length > 50)
							queue.dequeue()
					}
				}
			}
		}
		
		// this.vis[s[0]][s[1]] = false
		var res = []
		while (queue.length)
			res.push(queue.dequeue())
		return res
	}

	// s ~> t
	findPath(s, t) {
		// for (var x = 0; x < this.size_ver; ++x) {
		// 	for (var y = 0; y < this.size_hor; ++y) {
		// 		this.vis[x][y] = false
				
		// 	}
		// }
		return this.single(s, t, true)
	}

	BFS(start) {
		var points = [start]
		var vis = this.createArray(this.size_ver, this.size_hor, 1, false)

		var queue = []
		queue.push(start)
		vis[start[0]][start[1]] = true

		while(queue.length)
		{
			var v = queue.shift()

			for (var i of this.possibleDirections(v))
			{
				var w = this.moved(v, i)
				var canGoFurther = false
				for (var j = 0; j < 8; ++j) {
					if (this.graph[w[0]][w[1]][j]) {
						canGoFurther = true
						break
					}
				}
				
				if (!vis[w[0]][w[1]])
				{
					vis[w[0]][w[1]] = true
					points.push(w)
					if (canGoFurther)
						queue.push(w)
				}
			}
		}

		return points
	}

	search(depth, player, alpha, beta) {
		var best = [(player ? 2000 : -2000), []]

		var evaluation = evalFunction(this.ball)
		if ((depth == 0) || (Math.abs(evaluation) == 1000))
			return [evaluation, []]

		var losing = this.BFS((player==0 ? [1, 4] : [11, 4]))
		// var points = this.BFS(this.ball)

		// maybe it's better to go through points with no edges here
		for (var x = 1; x < this.size_ver-1; ++x) {
			for (var y = 1; y < this.size_hor-1; ++y) {
				if (this.ball[0] == x && this.ball[1] == y)
					continue
				if (losing.indexOf([x, y])!=-1)
					continue

				var end = true
				for (var dir of this.graph[x][y]) {
					if (dir == true)
					{
						end = false
						break
					}
				}

				if (!end && x != 1 && x != 11)
					continue
				
				// if(depth==2)
				// 	console.log(x, y)

				var paths = this.findPath(this.ball, [x, y])
				for (var [_, path] of paths.reverse()) {
					if (path !== null && path.length > 0) {
						this.makeMove(path)
						
						if (player == 0) {
							var val = this.search(depth - 1, 1 - player, alpha, beta)
							if (val[0] > best[0]) {
								best = [val[0], path]
							}
							// else if (val[0] == best[0] && val[1][0]+1>best[0][1])
							// 	best = [val[0], [val[1][0]+1, path]]
							if(best[0]>=beta)
							{
								this.unmakeMove(path)
								return best
							}
							alpha=Math.max(alpha, best[0])
						}
						else {
							var val = this.search(depth - 1, 1 - player, alpha, beta)
							if (val[0] < best[0]) {
								best = [val[0], path]
							}
							// else if (val[0] == best[0] && val[1][0]+1>best[0][1])
							// 	best = [val[0], [val[1][0]+1, path]]
							if (alpha >= best[0]) {
								this.unmakeMove(path)
								return best
							}
							beta = Math.min(beta, best[0])
						}
						// if (depth == 2)
						// 	console.log(val[0], path)
						this.unmakeMove(path)
					}
				}
			}
		}

		// if (depth == 2) {
		// 	console.log(best)
		// }
		return best
	}
}

// var b = new Board(50, 50, 50, [1, 1], ['a', 'b'], 0)

// var ext_board = [new ExtBoard(b, 9, 13), new ExtBoard(b, 9, 13)]

// var sr=0
// var n=0
// var i = 0
// while (b.win == -1) {
// 	var start=performance.now()
// 	var move = ext_board[b.turn].search(4, b.turn, -2000, 2000)[1]
// 	var end=performance.now()
// 	n++
// 	sr=(sr*(n-1)+Math.round((end-start)*100)/100)/n
// 	console.log("Time: ", Math.round((end-start)*100)/100, 'ms', 
// 				'Avg: ', Math.round(sr*100)/100+'ms')
// 	console.log(b.turn, move)

// 	for (var dir of move) {
// 		var ind = b.possibleMovesIndexes()
// 		if (!b.move(ind.indexOf(dir))) {
// 			console.log("AAaaaaaaaaaaaaa")
// 			break
// 		}
// 	}
// 	ext_board[0].makeMove(move)
// 	ext_board[1].makeMove(move)
// 	b.draw(i)
// 	i = i + 1
// }
// console.log(b.win)


// // var ext_board = new ExtBoard(b, 9, 13)

// // console.log(ext_board.BFS([6, 4]))

// module.exports = {}