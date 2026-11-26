import test from 'node:test';
import assert from 'node:assert/strict';
import {readEmailConfirmation,confirmationFailure} from '../src/utils/email-confirmation.ts';
test('accepts the existing implicit signup confirmation format',()=>{assert.deepEqual(readEmailConfirmation('','#access_token=access&refresh_token=refresh&type=signup'),{access_token:'access',refresh_token:'refresh'})});
test('invalid/expired/used links and recovery or PKCE URLs cannot establish signup sessions',()=>{for(const [query,hash] of [['',''],['?error=access_denied','#access_token=a&refresh_token=r&type=signup'],['','#error_code=otp_expired'],['','#access_token=a&type=signup'],['','#access_token=a&refresh_token=r&type=recovery'],['?code=pkce','']])assert.throws(()=>readEmailConfirmation(query,hash),{message:confirmationFailure})});
