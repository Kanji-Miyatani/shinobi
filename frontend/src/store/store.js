import {createStore,combineReducers} from 'redux';
import loginInfoReducer from '../reducer/loginInfo';

const rootReducer = combineReducers({
    loginInfoReducer
})

const store = createStore(rootReducer);

export default store;