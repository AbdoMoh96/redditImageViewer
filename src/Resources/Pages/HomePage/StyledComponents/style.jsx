import styled from "styled-components";

const c = {
  btn_color: "#232323",
  text_color: "hsl(40, 85%, 68%)"
};

const Img =  styled.img`
  border-radius: 10px;
  max-height: 100vh;
  max-width: 100vw;
  margin-bottom: 2vh;

  @media only screen and (max-width: 800px){
    max-width: 100%;
    max-height: 100%;
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
  position: absolute;
  color: whitesmoke;
  z-index: 999;
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

const PanelPtn = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  row-gap: 3px;
  position: absolute;
  width: 40px;
  height: 40px;
  right: 2.9%;
  bottom: 3.3%;
  background-color: green;
  border-radius: 50%;
  border-style: none;
  z-index: 200;
  opacity: 0.4;
  transition: opacity 0.4s ease;
  
  &:hover{
    opacity: 1;
  }
  
  span{
   border-radius: 10px;
    width: 20px;
    border: 2px solid white;
  }
`;

export { Img , Button , PanelPtn };
