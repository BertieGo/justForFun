import React, { Component } from 'react';
import logo from './logo.svg';
import Gomoku from './Gomoku/index';
import './App.css';

class App extends Component {
  constructor(props) {
  	super(props);
  }
  render() {
    return (
      <div className="App">
        <Gomoku/>
      </div>
    );
  }
}

export default App;
