import React, {Component} from 'react';
import classnames from 'classnames';
import config from './config';
import _ from 'lodash';

// 初始化棋盘
const initGrid = () => {
  const cellNumber = Math.pow(config.rowAndColNumber, 2);
  const cellArr = new Array(cellNumber).fill(0).map((item, index) => {
    return {
      isActive: null,
      column: (index + 1) % config.rowAndColNumber || config.rowAndColNumber,
      row: Math.ceil((index + 1) / config.rowAndColNumber)
    }
  });
  return cellArr;
};

// 格式化每个格子的行列
const formatRowAndColumn = (row, col) => {
  return row + '-' + col;
};

/**
 * {判断鼠标在画布内移动的位置是否满足可以点击的条件}
 * @param layer 画布内部layer object
 * @param wh 格子的宽高
 */
const availableClickAreaCondition = (layer, wh) => {
  return (
    layer % wh > wh - 10 &&
    layer % wh < wh
  ) || (
    layer % wh >= 0 &&
    layer % wh < 10
  );
};

// 判断附近的棋子是否根据其中的一种方式相连，米字型八个方向去查找
const connectingWay = [
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 0 ? item : (parseInt(item) + 1);
    }).join('-')
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 0 ? item : (parseInt(item) - 1);
    }).join('-');
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 1 ? item : (parseInt(item) + 1);
    }).join('-')
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 1 ? item : (parseInt(item) - 1);
    }).join('-');
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return parseInt(item) + 1;
    }).join('-');
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return parseInt(item) - 1;
    }).join('-');
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 0 ? parseInt(item) + 1 : parseInt(item) - 1;
    }).join('-');
  },
  (target) => {
    return target.split('-').map((item, index) => {
      return index === 0 ? parseInt(item) - 1 : parseInt(item) + 1;
    }).join('-');
  }
];

class Gomoku extends React.Component {

  constructor(props) {
  	super(props);
  	this.state = {
  		grid: initGrid(), // 棋盘网格, 用于维护所有的格子的状态，作用为view module
      currentPlayer: config.player.black, // 当前玩家，默认为黑棋先走
      isCanvasModel: false, // 是否是画布模式
      moveCells: [], // 保存过去的操作
      cancelCells: [], // 保存回撤的操作
      isMouseInAvailableArea: false // 画布现在是否满足可以点击的条件，鼠标是否在十字中心附近
  	};
    this.connectingNum = config.initConnectingNum; // 用来叠加棋子相连数量的
    this.isAvailableClickArea = _.throttle(this.isAvailableClickArea, 100); // 判断画布是否可以点击，节流
  }

  // 代理十字线中心点击事件
  handleCellClick = (cellItem, cellIndex, cb) => {
    const state = this.state;
    // 假如这个位置已经有棋了，不与操作。
    if (cellItem.isActive) {
    	return void 0;
    }
    // 深拷贝一份原来的grid
    const gridCopy = _.cloneDeep(state.grid);
    // 表明该下标为cellIndex内的isActive属性内的belong为白棋还是黑棋
    gridCopy[cellIndex].isActive = {
      belong: state.currentPlayer
    };
    this.setState({
      grid: gridCopy
    }, () => {
      // 是否已经达成赢了的条件
      if (this.isWin(cellItem)) {
        alert(state.currentPlayer + '赢了!');
      } else {
        this.setState({
          // 假如没有达成赢局标准，切换玩家，同时记录上一步操作的下标，以便回撤
          currentPlayer: state.currentPlayer === config.player.black ? config.player.white : config.player.black,
        });
      }
      // 将操作存放至moveCells内
      this.addMoveCells(this.state.grid[cellIndex], cellIndex);
      cb && typeof cb === 'function' && cb();
    });
  };

  // 将每一个操作都存放到moveCells内
  addMoveCells = (cellItem, cellIndex) => {
    const lastCellCopy = _.cloneDeep(cellItem);
    const moveCellsCopy = _.cloneDeep(this.state.moveCells);
    // 包括棋子的行列，是否激活，下标信息
    moveCellsCopy.push({
      info: lastCellCopy,
      index: cellIndex
    });
    this.setState({
      moveCells: moveCellsCopy,
      // 重新制空cancelCells
      cancelCells: []
    });
  };

  // 获取到当前玩家所有的棋子的信息，然后组装成'1-2', 此类的格式的数组
  getCurrentPlayerActiveCell = () => {
    const state = this.state;
    return state.grid.filter((item) => {
      return item.isActive && item.isActive.belong === state.currentPlayer;
    }).map((item) => {
      return formatRowAndColumn(item.row, item.column);
    });
  };

  /**
   * {判断是否达成获胜条件}
   * @param cellItem {下的最后一步棋}
   * @returns {boolean}
   */
  isWin = (cellItem) => {
    const activeCells = this.getCurrentPlayerActiveCell();
    // 已最后的棋子为基准点，分为8个方向，米字型去遍历activeCells内是否满足获胜条件
    const lastCellFormat = formatRowAndColumn(cellItem.row, cellItem.column);

    // 遍历八个方向，判断是否连接棋的数量足够5个
    if (
      connectingWay.some((way) => {
        // 是否已经达成赢局条件，假如没有则重置连接棋的数量
        const isWin = this.isConnecting(lastCellFormat, activeCells, way);
        !isWin && (this.connectingNum = config.initConnectingNum);
        return isWin;
      })
    ) {
    	return true;
    }
    return false;
  };

  /**
   * {朝某个方向上去查找，是否有继续连接的棋子}
   * @param target 下一个位置是否有棋子
   * @param activeCellsList 所有棋子的集合
   * @param connectingWay 查找下个棋子的方式
   * @returns {boolean}
   */
  isConnecting = (target, activeCellsList, connectingWay) => {
    const state = this.state;
    const nextTarget = connectingWay(target);

    // 假如预期该方向上的下一个点有该玩家的棋子，那么连接数自加1；
    if (activeCellsList.includes(nextTarget)) {
      this.connectingNum ++;
      // 递归查找，假如满足5个棋子连接在一起的条件，win
      this.isConnecting(nextTarget, activeCellsList, connectingWay);
      if (this.connectingNum === config.winConditionNum) {
      	return true;
      }
    } else {
      return false;
    }
  };

  // 悔棋
  handleRegret = () => {
    // moveCell删去最后一个成员，cancelCells增加最后一个成员
    const copyGrid = _.cloneDeep(this.state.grid);
    const moveCellsCopy = _.cloneDeep(this.state.moveCells);
    const cancelCellsCopy = _.cloneDeep(this.state.cancelCells);
    const lastMoveCell = moveCellsCopy[moveCellsCopy.length - 1];
    // 制空之前的操作
    copyGrid[lastMoveCell.index].isActive = null;
    cancelCellsCopy.push(moveCellsCopy.pop());
    this.setState({
      grid: copyGrid,
      moveCells: moveCellsCopy,
      cancelCells: cancelCellsCopy,
      // 将当前玩家重置回上一个玩家
      currentPlayer: this.state.currentPlayer === config.player.black ? config.player.white : config.player.black,
    }, () => {
      // 假如是canvas模式，重新渲染
      if (this.state.isCanvasModel) {
        this.renderCanvas();
      }
    });
  };

  // 撤销悔棋，原理如上悔棋
  handleCancelRegret = () => {
    const copyGrid = _.cloneDeep(this.state.grid);
    const moveCellsCopy = _.cloneDeep(this.state.moveCells);
    const cancelCellsCopy = _.cloneDeep(this.state.cancelCells);
    const lastCancelCell = cancelCellsCopy[cancelCellsCopy.length - 1];
    copyGrid[lastCancelCell.index] = lastCancelCell.info;
    moveCellsCopy.push(cancelCellsCopy.pop());
    this.setState({
      grid: copyGrid,
      moveCells: moveCellsCopy,
      cancelCells: cancelCellsCopy,
      currentPlayer: this.state.currentPlayer === config.player.black ? config.player.white : config.player.black,
    }, () => {
      // 回撤的时候也要提醒是否达成赢棋条件，防止过度回撤
      if (this.isWin(lastCancelCell.info)) {
        this.doWinThing();
      }
      if (this.state.isCanvasModel) {
        this.renderCanvas();
      }
    });
  };

  // 切换canvas或者普通模式
  handleChangeModel = () => {
    this.setState({
      isCanvasModel: !this.state.isCanvasModel
    }, () => {
      if (this.state.isCanvasModel) {
      	this.renderCanvas();
      }
    });
  };

  // 渲染canvas
  renderCanvas  = () => {
    const state = this.state;
    const canvas = this.canvas;
    // 横竖个多少条线
    const lineTotalNum = config.rowAndColNumber - 1;
    const context = canvas.getContext('2d');
    // 重置画板
    context.clearRect(0, 0, config.chessboardWH + config.canvasPadding, config.chessboardWH + config.canvasPadding);
    // 描绘横竖线条
    new Array(lineTotalNum * 2).fill(0).forEach((item, index) => {
      context.lineWidth = 1;
      context.beginPath();
      const halfPadding = config.canvasPadding / 2;
      // 横线
      if (index < lineTotalNum) {
        context.moveTo(config.cellWH * index + halfPadding, halfPadding);
        context.lineTo(config.cellWH * index + halfPadding, config.chessboardWH + halfPadding)
      } else {
        // 竖线
        context.moveTo(halfPadding, config.cellWH * (index % lineTotalNum) + halfPadding);
        context.lineTo(config.chessboardWH + halfPadding, config.cellWH * (index % lineTotalNum) + halfPadding)
      }
      context.stroke();
    });

    state.grid.map((item, index) => {
      // 判断是否是已经下过棋的格子，是的话描绘棋子
      if (item.isActive) {
        const bg = item.isActive.belong === config.player.black ? '#000' : '#fff';
        context.beginPath();
        // 画棋子
        context.arc(
          (item.column - 1) * config.cellWH,
          (item.row - 1) * config.cellWH,
          (config.cellWH - 10) / 2,
          0,
          Math.PI * 2
        );
        context.fillStyle = bg;
        context.fill();
      }
    });
  };

  // 画布是否可以点击了
  isAvailableClickArea = (x, y) => {
    if (
      availableClickAreaCondition(x, config.cellWH) &&
      availableClickAreaCondition(y, config.cellWH)
    ) {
      if (!this.state.isMouseInAvailableArea) {
      	this.setState({
          isMouseInAvailableArea: !this.state.isMouseInAvailableArea
        });
      }
    } else {
      if (this.state.isMouseInAvailableArea) {
        this.setState({
          isMouseInAvailableArea: !this.state.isMouseInAvailableArea
        });
      }
    }
  };

  // 画布上的点击事件代理，获取到当前的位置去判断操作在哪里下期
  handleCanvasClick = (e) => {
    if (!this.state.isMouseInAvailableArea) {
      return void 0;
    }
    const index = this.getCellIndex(e.pageX, e.pageY);
    // 触发前格子点击事件
    this.handleCellClick(
      this.state.grid[index], index, this.renderCanvas
    );
  };

  // 画布鼠标移动判断是否到达了可以点击的区域
  handleCanvasMouseMove = (e) => {
    this.isAvailableClickArea(
      e.pageX - config.cellWH - config.availableClickAreaWH,
      e.pageY - config.cellWH - config.availableClickAreaWH
    );
  };

  // 获取当前点击格子处于grid中的下标
  getCellIndex = (x, y) => {
    const row = y % config.cellWH > config.cellWH - 10 ?
      Math.floor(y / config.cellWH) + 1 : Math.floor(y / config.cellWH);
    const col = x % config.cellWH > config.cellWH - 10 ?
      Math.ceil(x / config.cellWH) + 1 : Math.ceil(x / config.cellWH);
    const index = row * config.rowAndColNumber + col - 1;
    return index;
  };

  // 重新开始
  resetGrid = () => {
    this.setState({
      grid: initGrid(),
      cancelCells: [],
      moveCells: []
    }, () => {
      if (this.state.isCanvasModel) {
        this.renderCanvas();
      }
    });
  };

  // 当玩家胜利时候的提示
  doWinThing = () => {
    alert(this.state.currentPlayer + '赢了!');
  };

  render() {
    const state = this.state;
    return (
      <div className="wrap">
        {
          state.isCanvasModel ? (
            <div className="canvasContainer">
              <canvas
                width={config.chessboardWH + config.canvasPadding}
                height={config.chessboardWH + config.canvasPadding}
                style={{
                  background: '#ddb88a',
                  cursor: state.isMouseInAvailableArea ? 'pointer' : 'default'
                }}
                ref={ref => { this.canvas = ref; }}
                onClick={this.handleCanvasClick}
                onMouseMove={this.handleCanvasMouseMove}
              />
            </div>
          ) : (
            <div className="normalContainer">
              {
                new Array(Math.pow(13, 2)).fill(0).map(() => {
                  return (
                    <div
                      className='cell'
                    />
                  )
                })
              }
              {
                state.grid.map((cellItem, cellIndex) => {
                  return (
                    <div
                      className={classnames(
                        'piece',
                        cellItem.isActive ?
                          cellItem.isActive.belong === config.player.black ? 'activeBlack' : 'activeWhite' :
                          ''
                      )}
                      onClick={this.handleCellClick.bind(this, cellItem, cellIndex)}
                      style={{
                        top: ((cellItem.row - 1) * config.cellWH) - config.availableClickAreaWH / 2,
                        left: ((cellItem.column - 1) * config.cellWH) - config.availableClickAreaWH / 2
                      }}
                    >
                    </div>
                  )
                })
              }
            </div>
          )
        }
        <div className="operation">
          <button onClick={this.handleRegret} disabled={state.moveCells.length === 0}>
            悔棋
          </button>

          <button onClick={this.handleCancelRegret} disabled={state.cancelCells.length === 0}>
            撤回悔棋
          </button>

          <button onClick={this.handleChangeModel}>
            {state.isCanvasModel ? '切换成普通模式' : '切换成canvas模式'}
          </button>

          <button onClick={this.resetGrid}>
            重新开始
          </button>
        </div>
      </div>
    )
  }
}

export default Gomoku;