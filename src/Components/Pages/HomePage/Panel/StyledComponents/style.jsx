import styled from "styled-components";

const c = {
    btn_color: "#232323",
    text_color: "hsl(40, 85%, 68%)"
};


const Section = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100vw;
  height: 10vh;
  padding: 0 20px;
  background-color: #333456;
  position: absolute;
  bottom: -10vh;
  z-index: 100;
  visibility: visible;
  opacity: 1;
  border-top: 2px solid #d4d4d4;
  transition: bottom 0.6s ease;

  @media only screen and (max-width: 800px){
    height: 100vh;
    bottom: -100vh;
  }
`;

const OpenBtn = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  row-gap: 5px;
  position: absolute;
  top: -40px;
  right: 5%;
  width: 40px;
  height: 40px;
  font-size: 1rem;
  color: white;
  border-width: 2px 2px 0 2px;
  border-style: solid;
  border-color: white;
  background-color: #333456;
  border-radius: 5px 5px 0 0;
  outline: none;
  span{
    border-radius: 10px;
    width: 20px;
    border: 1px solid white;
  }

  @media only screen and (max-width: 800px){
    top: -60px;
    border-width: 2px 2px 2px 2px;
    border-radius: 50%;
  }
`;

const CloseBtn = styled.button`
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  row-gap: 5px;
  position: absolute;
  bottom: 9%;
  right: 5%;
  width: 40px;
  height: 40px;
  font-size: 1rem;
  color: white;
  border-width: 2px 2px 2px 2px;
  border-style: solid;
  border-color: white;
  background-color: #272955;
  border-radius: 50%;

  @media only screen and (max-width: 800px) {
    display: flex;
  }
`;

const Button = styled.button`
  
  background-color: ${ c.btn_color };
  width: 10rem;
  height: 3rem ;
  font-family: sans-serif;
  font-size: 1rem;
  border-radius: 2rem;
  border: 2px solid transparent;
  color: whitesmoke;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.6s ease,
              border-color 0.6s ease,
              background-color 0.6s ease;
  &:hover{
    color: ${c.text_color};
    border-color: ${c.text_color};
    background-color: transparent;
  }
  &:hover:after{
    border-color: ${c.text_color};
  }
  

  @media only screen and (max-width: 800px){
    width: 8rem;
    height: 2rem;
    font-size: 0.8rem;
  }
`;

const Card = styled.div`
  width: 10%;
  height: 80%;
  background-color: gray;
  cursor: pointer;
  border-radius: 10px;
  color: white;
  font-family: 'Dancing Script', cursive;
  font-size: 1.5rem;

  @media only screen and (max-width: 800px){
    width: 70%;
    height: 20%;
  }
  
  section{
    display: flex;
    justify-content: space-evenly;
    align-items: flex-end;
    height: 100%;
    background-color: black;
    border-radius: 10px;
    opacity: 0.5;
    transition: opacity 0.5s ease,
                background-color 0.5s ease;
    h1{
      text-shadow: 0 4px 5px #000000;
      margin-bottom: 10px;
    }
    
  }
`;



export { Section , OpenBtn, CloseBtn , Button , Card };