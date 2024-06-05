export const generateCode = (numberLength: number): string  => {
    let code = '';
    for (let i = 0; i < numberLength; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}
