import { Controller, Get } from "@nestjs/common";
import { FacilitiesService } from "./facilities.service";

@Controller("facilities")
export class FacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  @Get()
  list() {
    return this.facilities.listFacilities();
  }

  @Get("districts")
  districts() {
    return this.facilities.listDistricts();
  }
}
