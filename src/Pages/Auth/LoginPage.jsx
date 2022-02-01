// // eslint-disable-next-line no-unused-vars
// import React, {useEffect , useState} from 'react';
// import { useForm } from "react-hook-form";
// import swal from "sweetalert";
// import bulma from '../../Resources/Public/Scss/bulma/bulma.sass';
// import '../../Resources/Pages/LoginPage/scss/style.scss';
// import mainLogo from '../../Resources/Pages/LoginPage/img/main_logo.png';
// import Layout from "../../Layout/Layout";
// import ReCAPTCHA from "react-google-recaptcha";
// import axios from "axios";
// import {loginUrl} from "../../Helpers/Api/url";
// import {useDispatch} from "react-redux";
// import {loginAction} from "../../Redux/Public/Actions/PublicUserAction";
// import {useNavigate} from 'react-router-dom';
//
//
// const LoginPage = () => {
//
//     const { register, handleSubmit, formState: { errors } } = useForm();
//     const [captcha , updateCaptcha] = useState(false);
//     const [loading , loadingUpdate] = useState(false);
//     const dispatch = useDispatch();
//     const navigate = useNavigate();
//
//     useEffect(() => {
//     } , []);
//
//     const onSubmit = (data) => {
//        if (captcha){
//          loadingUpdate(state => !state);
//          userLogin(data).catch();
//        }else{
//            swal( "Google Captcha" ,  "please confirm google Captcha!" ,  "error" ).catch();
//        }
//     }
//
//     const userLogin = async (data) => {
//         try {
//             const res = await axios.post(loginUrl, data);
//             localStorage.setItem('user', JSON.stringify(res.data.user));
//             dispatch(loginAction(res.data.user));
//             navigate('/home');
//         }catch (error){
//             if(error.response.status === 401){
//                 loadingUpdate(state => !state);
//                 swal( "Wrong Credentials" ,  "Email or Password Are Wrong!!" ,  "error" ).catch();
//             }
//         }
//     }
//
//     const onChange = () => {
//         updateCaptcha(state => !state);
//     }
//
//     return (
//         <Layout>
//
//             <section className={`main_container ${bulma}`}>
//
//                 <div className={'form_container'}>
//
//                     <img className={'login_logo'} src={mainLogo} alt="logo"/>
//
//                     <form className={'main_form'} onSubmit={handleSubmit(onSubmit)}>
//                       <div className="field">
//                           <p className="control has-icons-left has-icons-right">
//                               <input className="input" type="email"
//                                      {...register("email" , { required: true })}
//                                      placeholder="Email"/>
//                              <span className="icon is-small is-left">
//                                  <i className="fas fa-envelope"/>
//                              </span>
//                           </p>
//                           {errors.email && <p className={'has-text-danger'}>email is required</p>}
//                       </div>
//
//                       <div className="field">
//                           <p className="control has-icons-left">
//                               <input className="input" type="password"
//                                      {...register("password" , { required: true })}
//                                      placeholder="Password" />
//                             <span className="icon is-small is-left">
//                               <i className="fas fa-lock" />
//                             </span>
//                           </p>
//                           {errors.password && <p className={'has-text-danger'}>password is required</p>}
//                       </div>
//
//                         <div className="field is-flex is-justify-content-center ">
//
//                             <ReCAPTCHA
//                                 sitekey="6LeJFrkdAAAAAIzd1JkDY1Kd7VQG2LNmlnAhE7ph"
//                                 onChange={onChange}
//                             />
//                         </div>
//
//                         <div className="field">
//                             <button
//                                 className={`button is-warning is-fullwidth is-outlined ${loading && 'is-loading'}`}>
//                                 Login
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             </section>
//
//         </Layout>
//     );
//
//
//
// }
//
// export default LoginPage;