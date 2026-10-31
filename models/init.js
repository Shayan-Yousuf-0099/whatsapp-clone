import mongoose from "mongoose";
import Chat from "./chat.js";
main()
.then(()=>{
    console.log("connection successful")
})
.catch((err)=>{
    console.log(err)
});
async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/whatsapp");
}

let allchat = [
  {
    from: "shayan",
    to: "abdullah",
    msg: "me theak tu suna",
    created_at: new Date(),
  },
  {
    from: "abdullah",
    to: "shayan",
    msg: "or suna",
    created_at: new Date(),
  },
  {
    from: "hammad",
    to: "shayan",
    msg: "Jo baat hai",
    created_at: new Date(),
  },
  {
    from: "shayan",
    to: "sarfaraz",
    msg: "apny keh dia hum ne man lia",
    created_at: new Date(),
  },
  {
    from: "sarafaraz",
    to: "haris",
    msg: "Ai ha",
    created_at: new Date(),
  },
];
Chat.insertMany(allchat);
