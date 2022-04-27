import './style/App.css';
import Login from './components/Login'
import {Routes, Route} from 'react-router-dom';
import {useSelector} from 'react-redux';
import Home from './components/Home';
function App() {
  const viewSource = useSelector(state => state.loginInfoReducer.backGroundImage);
  const style={
    backgroundImage:`url(${viewSource})`,
    height:'100vh',
    backgroundSize:'cover'
}
  return (
    <div className="App" style={style}>
      <Routes>
        <Route exact path="/" element={<Login />}></Route>
        <Route exact path="/Home" element={<Home />}></Route>
      </Routes>
    </div>
  );
}

export default App;
