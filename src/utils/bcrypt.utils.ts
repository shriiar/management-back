import * as bcrypt from 'bcrypt';

export async function hashPassword(password:string) {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(plainPassword:string, hashedPassword:string) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}