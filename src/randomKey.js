// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
export default function randomKey(length = 32, chars = '0123456789abcdefghijklmnopqrstuvwxyz') {
    let result = '';

    for (let i = length; i > 0; i--) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}
