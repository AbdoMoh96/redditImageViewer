import React,{useEffect , useState} from "react";
import {Section, OpenBtn, CloseBtn , Button} from "./StyledComponents/style";
import './Scss/style.scss';
import axios from "axios";
import '../../../../Resources/Public/Scss/bulma/bulma.sass';
import imagesGetter from "../../../../Helpers/imagesGetter";


const Panel = ({imagesUpdate , loader}) => {

    const[classes , updateClasses] = useState('panelHide');
    const[text , textUpdate] = useState('');
    const[count , countUpdate] = useState(1);

    useEffect(() => {
    } , [])

    const viewPanel = () => {
        if(classes === 'panelHide'){
            updateClasses('panelShow');
        }else{
            updateClasses('panelHide');
        }
    }

    const getImages = async (action) => {
        if(action === 'start'){
            loader(true);
            let res = await axios.get(
                `https://www.reddit.com/r/${text}/new.json?limit=100`
            ).catch(() => alert("shit went wrong!!!"));
            let urls = imagesGetter(res.data.data.children);
            imagesUpdate(state => urls);
            loader(false);
        }else if(action === 'next'){
            countUpdate(state => state + 1)
            console.log('next')
        }else if(action === 'previous'){
            countUpdate(state => state - 1)
            console.log('previous')
        }
    };

    return(
        <Section className={classes}>


                <Button
                    className={'previous_btn_panel'}
                    disabled={count <= 1}
                    onClick={() => getImages('previous')}
                >
                    previous stack
                </Button>

            <div className="field">
               <p className="control has-icons-left">
                   <input
                          className="input"
                          type="text"
                          placeholder="add subreddit's name"
                          onChange={(e) => textUpdate(state => e.target.value)}
                          value={text}
                          onKeyPress={(e) => e.key === 'Enter' && getImages('start')}
                    />
               </p>
            </div>

                <Button
                    className={'next_btn_panel'}
                    onClick={() => getImages('next')}
                >
                    next stack
                </Button>



            <OpenBtn onClick={() => viewPanel()}>
                <span/>
                <span/>
                <span/>
            </OpenBtn>

            <CloseBtn onClick={() => viewPanel()}>
                <h3>&#10005;</h3>
            </CloseBtn>
        </Section>
    );

}

export default Panel;