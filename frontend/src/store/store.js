import {createStore,combineReducers,compose} from 'redux';
import persistState from "redux-localstorage";
import loginInfoReducer from '../reducer/loginInfo';

const rootReducer = combineReducers({
    loginInfoReducer
})

const store = compose(persistState())(createStore)(rootReducer);

export default store;