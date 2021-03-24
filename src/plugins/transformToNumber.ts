import { Request } from '../common';
import clean from './utils/clean';

export function transformToNumber(req: Request) {
    req.message = clean.all(req.message)
        .replace('một', '1')
        .replace('hai', '2')
        .replace('hay', '2')
        .replace('ba', '3')
        .replace('bốn', '4')
        .replace('năm', '5')
        .replace('sáu', '6')
        .replace('bảy', '7')
        .replace('tám', '8')
        .replace('chín', '9')
        .replace('mười', '10');
}