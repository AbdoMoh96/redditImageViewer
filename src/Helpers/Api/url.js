
/*const mainUrl = 'https://laravel-proxy.herokuapp.com/hanime';*/
const mainUrl = 'https://proxy.superpets.com.sa/hanime';
const mainAuthUrl = 'https://proxy.superpets.com.sa/api';

const onLoadUrl = `${mainUrl}/all`;

const loginUrl = `${mainAuthUrl}/tokens/create`;

const logoutUrl = `${mainAuthUrl}/tokens/logout`;


const urlSeeker = (id) => {
  return  `${mainUrl}/seek/${id}`;
}

export { onLoadUrl , urlSeeker , loginUrl , logoutUrl };