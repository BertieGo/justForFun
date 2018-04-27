const config = {
  // 五子棋为 15 * 15
  rowAndColNumber: 15,
  // 赢棋的棋子数量。
  winConditionNum: 5,
  // 初始化连接的棋子数量。
  initConnectingNum: 1,
  // 格子的高度
  cellWH: 50,
  // 可点击的范围大小
  availableClickAreaWH: 20,
  // canvas 棋盘大小
  chessboardWH: 650,
  // canvas内边距总和
  canvasPadding: 100,
  player: {
    white: '白棋',
    black: '黑棋'
  }
};

export default config;