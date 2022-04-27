const initialState={
    avatarColor:"",
    avatorType:"",
    name:"",
    backGroundImage:"",
    auth:false
};

const loginInfoReducer = (state=initialState,action)=>{
    switch(action.type)
    {
        case 'SET_LOGININFO':
            const { name , avatarType, backGroundImage } = action.payload;
            console.log(state);
            return {
                name:name,
                avatorType:avatarType,
                avatarColor : '',
                backGroundImage:backGroundImage,
                auth:false
            }
        case 'SET_AUTHSTATE':
            const { auth } = action.payload;
            return {
                ...state,
                auth:auth
            }
    }
    
    console.log(state);
    return state;
};

export default loginInfoReducer;