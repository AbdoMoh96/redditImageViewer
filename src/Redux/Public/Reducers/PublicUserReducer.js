const defaultUser = {
    firstName:'',
    lastName:'',
    email:'',
    image:'',
    token:'',
    isLoggedIn:false
}

const PublicUserReducer = (state = defaultUser, action) => {
    switch (action.type){
        case 'USER_LOGIN':
            return {...state ,
                firstName: action.payload.firstName,
                lastName: action.payload.lastName,
                email: action.payload.email,
                image: action.payload.image,
                token: action.payload.token,
                isLoggedIn: action.payload.isLoggedIn
            }
        case 'USER_LOGOUT':
            return {...state ,
                firstName: action.payload.firstName,
                lastName: action.payload.lastName,
                email: action.payload.email,
                image: action.payload.image,
                token: action.payload.token,
                isLoggedIn: action.payload.isLoggedIn
            }
        default:
            return state;
    }
}


export default PublicUserReducer;