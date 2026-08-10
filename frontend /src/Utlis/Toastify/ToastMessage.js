import { toast } from "react-toastify";

const baseOptions = {
  position: "top-right",
  autoClose: 3200,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export const SuccessMessage = (message = "Done.") =>
  toast.success(message, baseOptions);

export const ErrorMessage = (message = "Something went wrong.") =>
  toast.error(message, baseOptions);

export const InfoMessage = (message = "") => toast.info(message, baseOptions);

export const WarningMessage = (message = "") =>
  toast.warning(message, baseOptions);

export const PromiseToast = (promise, messages) =>
  toast.promise(promise, messages, baseOptions);
