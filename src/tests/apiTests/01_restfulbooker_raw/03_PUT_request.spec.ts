import { test, expect } from "@playwright/test";
import { logger } from "@utils/logger";

test.describe('Update bokking', async () => {
    test('TC#2 @p0 - PUT : Verify that update the existing booking is working fine.', async ({ request }) => {
       let token = '';
        let bookingId = 0;

        const header = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const payload = {
            firstname: 'Pramod',
            lastname: 'Dutta',
            totalprice: 111,
            depositpaid: true,
            bookingdates: {
                checkin: '2018-01-01',
                checkout: '2019-01-01',
            },
            additionalneeds: 'Breakfast',
        };

        await test.step('Step 1 - Create auth token', async () => {

            const responsedata = await request.post('/auth',{
                headers:header,
                data: {
                username: 'admin',
                password: 'password123',
            },
        });
        const data = await responsedata.json();
        // console.log(data);
        token = data.token;
         expect(token).toBeTruthy();

        });

        await test.step('Step 2- create booking ID', async()=>{
            const resdata = await request.post('/booking',{
                 headers:header,
                 data: payload,

            });
              const data = await resdata.json();
            bookingId = data.bookingid;
            expect(bookingId).toBeTruthy();
            logger.info(`Created booking id for update: ${bookingId}`);
        });

        await test.step('step 3 update booking', async()=>{

          const responseData=  await request.put(`/booking/${bookingId}`,{
                 headers:{
                    ...header,
                    Cookie : `token=${token}`,
                 },
                 data : payload,
            });

            const data = await responseData.json();
            expect(data.firstname).toBe(payload.firstname);
            expect(data.lastname).toBe(payload.lastname);
            logger.info(`Updated booking id ${bookingId}: ${data.firstname} ${data.lastname}`);

        });

    });

});