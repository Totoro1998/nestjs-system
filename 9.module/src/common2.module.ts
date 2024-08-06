import { Module, Global } from "@nestjs/common";
import { CommonService } from "./common.service";
// 用于说明单例
@Global()
@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class Common2Module {}
