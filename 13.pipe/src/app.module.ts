import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { MyCustomGlobalPipe } from "./my-custom-global.pipe";
import { APP_PIPE } from "@nestjs/core";
@Module({
  controllers: [AppController],
  providers: [
    {
      provide: "PREFIX",
      useValue: "prefix",
    },
    {
      provide: APP_PIPE,
      useClass: MyCustomGlobalPipe,
    },
  ],
})
export class AppModule {}
