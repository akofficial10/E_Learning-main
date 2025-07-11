import { appStore } from "@/app/store";
import { authApi } from "@/features/api/authApi";

const initializeApp = async () => {
  await appStore.dispatch(
    authApi.endpoints.loadUser.initiate(undefined, { forceRefetch: true })
  );
};
export default initializeApp;