import { createContext } from 'react';

/** Only a signed-in personal mobile context has the local past-exam library. */
export const OfflineNoticeContext = createContext(false);
