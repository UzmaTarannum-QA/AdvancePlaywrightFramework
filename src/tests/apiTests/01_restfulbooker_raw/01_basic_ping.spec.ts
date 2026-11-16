import {test,expect} from "@playwright/test";
import { request } from "node:http";

test('ping request GET', async({request})=>{
    const responseData =await request.get('/ping');
    console.log(responseData);
    expect(responseData.status).toBe(201);

});