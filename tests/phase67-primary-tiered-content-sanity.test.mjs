import test from 'node:test';
import {validateTieredBank} from './tiered-bank-source-validator.mjs';

test('Primary 1, 2, 3, 4, 5, 6 weekly tiered banks have complete questions, answers and rubrics',async()=>{
 for(const grade of [1,2,3,4,5,6])await validateTieredBank(grade);
});
