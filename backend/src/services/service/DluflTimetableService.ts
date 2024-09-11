import { Parameter, Configuration } from "../../providers/CommonProvider";
import { ServiceProvider } from "../../providers/ServiceProvider";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { authorizeIdentity } from "../../controllers/identityController";
import axios, { AxiosResponse } from "axios";
import setCookie from "set-cookie-parser";
import {
  getServiceRuntimeData,
  setServiceRuntimeData,
} from "../../controllers/serviceController";

class DluflTimetableService extends ServiceProvider {
  name = "DLUFL Timetable Service";
  description = "Provides access to the DLUFL Timetable resources";
  icon = "https://example.com/icon.png";
  category = "library";
  type = "dlufl_library";
  identityType = ["dlufl_undergrad"];
  params: Parameter[] = [];
  interval = 60 * 60 * 1000;
  tools: any[] = [];

  private dcpHost: string = "https://i.dlufl.edu.cn/dcp/";
  private requestHeaders = {
    "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`,
    "Content-Type": "application/json",
  };
  private cookieList = ["dcp114"];
  private token: { [key: string]: string } | null = null;
  private weekCount: number = 20;
  public serviceId: string = "";

  constructor() {
    super();
    this.tools = [this.getTimetable];
  }

  public async init(
    identityId: string,
    config: Configuration,
    serviceId: string = "",
  ): Promise<boolean> {
    if (!(await super.init(identityId, config))) return false;

    this.serviceId = serviceId;

    const authResponse = await this.auth();
    if (!authResponse.success) {
      return false;
    }

    return true;
  }

  getTimetable = new DynamicStructuredTool({
    name: "getTimetable",
    schema: z.object({
      schoolYear: z.string(),
      semester: z.string(),
      learnWeek: z.string(),
    }),
    description: `This function returns the timetable for a given schoolYear, semester, and learnWeek. The schoolYear should be a string like \"2024-2025\", semester should be a number string like "1", and learnWeek should be a number string from range "1" to "${this.weekCount}".`,
    func: async ({ schoolYear, semester, learnWeek }) => {
      if (!this.token) {
        return { success: false, message: "Not authenticated" };
      }

      try {
        const response: AxiosResponse = await axios.post(
          `${this.dcpHost}apps/classScheduleApp/getClassbyUserInfo`,
          {
            schoolYear,
            semester,
            learnWeek,
          },
          {
            headers: { ...this.requestHeaders, Cookie: this.token?.cookie },
          },
        );

        if (response.data && Array.isArray(response.data)) {
          const formattedTimetable = this.formatTimetableForLLM(
            response.data,
            learnWeek,
          );
          return { success: true, data: formattedTimetable };
        } else {
          return {
            success: false,
            message: "No timetable found for the given inputs",
          };
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to fetch timetable: ${error.message}`,
        };
      }
    },
  });

  formatTimetableForLLM(schedule: any[], learnWeek: string): string {
    const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const timeSlots: { [key: string]: string } = {
      "1": "1-2节（08:30~09:50）",
      "3": "3-4节（10:10~11:30）",
      "5": "5-6节（13:30~14:50）",
      "7": "7-8节（15:10~16:30）",
      "9": "9-10节（18:00~19:20）",
      "11": "11-12节（19:40~21:00）",
    };

    let resultText = "";

    schedule.forEach((item: any) => {
      const skxq = item.SKXQ;
      const dayIndex = parseInt(skxq) - 1;
      const dayName = weekDays[dayIndex];
      const timeSlotKey = parseInt(item.SKJC, 10).toString();
      const slotName = timeSlots[timeSlotKey];

      // 检查当前课程是否在本周范围内
      if (this.isWeekInRange(learnWeek, item.SKZC)) {
        const courseName = item.KCMC;
        const location = item.JXDD;
        const teacher = item.JSXM;

        resultText += `${dayName} ${slotName}：课程《${courseName}》，授课地点：${location}，授课教师：${teacher}。\n`;
      }
    });

    return resultText;
  }

  isWeekInRange(week: string, skzc: string): boolean {
    const ranges = skzc.split(",").map((range) => range.split("-").map(Number));
    return ranges.some(
      ([start, end]) => Number(week) >= start && Number(week) <= end,
    );
  }

  async getSchoolYears(): Promise<string[]> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    const response: AxiosResponse = await axios.post(
      `${this.dcpHost}apps/classScheduleApp/getSchoolYear`,
      {
        mapping: "getSchoolYear",
      },
      {
        headers: { ...this.requestHeaders, Cookie: this.token?.cookie },
      },
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data.map((item) => item.SCHOOL_YEAR).sort();
    } else {
      throw new Error("Failed to fetch school years");
    }
  }

  async getSemesterDates(): Promise<{ [key: string]: string[] }> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    const schoolYears = await this.getSchoolYears();
    const semesterDates: { [key: string]: string[] } = {};

    for (const schoolYear of schoolYears) {
      const startDate1 = await this.getSemesterStartDate(schoolYear, "1");
      const startDate2 = await this.getSemesterStartDate(schoolYear, "2");

      if (startDate1.success && startDate2.success) {
        semesterDates[schoolYear] = [startDate1.data, startDate2.data];
      }
    }

    return semesterDates;
  }

  async getTodayInfo(): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (!this.token) {
      return { success: false, message: "Not authenticated" };
    }

    const response: AxiosResponse = await axios.post(
      `${this.dcpHost}apps/classScheduleApp/getLearnweekbyDate`,
      {},
      {
        headers: { ...this.requestHeaders, Cookie: this.token?.cookie },
      },
    );

    if (
      !response.data.schoolYear ||
      !response.data.semester ||
      !response.data.learnWeek
    ) {
      return { success: false, message: "Today's Info not found" };
    }
    return { success: true, data: response.data };
  }

  async getSemesterStartDate(
    schoolYear: string,
    semester: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (!this.token) {
      return { success: false, message: "Not authenticated" };
    }

    const response: AxiosResponse = await axios.post(
      `${this.dcpHost}apps/classScheduleApp/getDatebyLearnweek`,
      {
        SCHOOL_YEAR: schoolYear,
        SEMESTER: semester,
        learnWeek: "1",
      },
      {
        headers: { ...this.requestHeaders, Cookie: this.token?.cookie },
      },
    );

    if (response.data.date1) {
      return { success: true, data: response.data.date1 };
    } else {
      return { success: false, message: "Semester start date not found" };
    }
  }

  async auth(): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const ticketResponse = await authorizeIdentity(this.identityId, {
        url: this.dcpHost,
      });
      const location = `${this.dcpHost}?ticket=${ticketResponse.data?.ticket}`;

      const callbackResponse: AxiosResponse = await axios.get(location, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: { ...this.requestHeaders },
      });

      const setCookieHeader = callbackResponse.headers["set-cookie"];
      if (!setCookieHeader) {
        return { success: false, message: "Set-Cookie header not found" };
      }

      const cookies = setCookie.parse(setCookieHeader);
      const cookieMap = new Map(
        cookies.map((cookie) => [cookie.name, cookie.value]),
      );

      const missingCookies = this.cookieList.filter(
        (cookieName) => !cookieMap.has(cookieName),
      );
      if (missingCookies.length === 0) {
        const cookieString = this.cookieList
          .map((cookieName) => `${cookieName}=${cookieMap.get(cookieName)}`)
          .join("; ");
        this.token = { cookie: cookieString };
        return { success: true, data: { cookie: cookieString } };
      } else {
        return {
          success: false,
          message: `Missing cookies: ${missingCookies.join(", ")}`,
        };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async prompt(question: string): Promise<string> {
    const runtimeData = await getServiceRuntimeData(this.serviceId);
    if (!runtimeData.success || !runtimeData.data) {
      await this.update();
    }

    const { todayInfo, semesterDates } = runtimeData.data;
    const { schoolYear, semester, learnWeek } = todayInfo;
    const todayDate = new Date().toISOString().split("T")[0].replace(/-/g, ".");
    const todayWeekDay = new Date().getDay();
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

    let promptString = `用户已经接入课程表服务。今天是${todayDate}星期${weekDays[todayWeekDay]},系统每60分钟获取到的信息为：【现在是${schoolYear}学年、第${semester}学期，当前周为第${learnWeek}周，今天应该${todayInfo?.isHoliday ? "是" : "不是"}假期】，该信息可能过时，你也可以根据每学期的开始日期和今天的日期、星期自行推断。`;

    promptString += "\n\n以下是各学年各学期的开始日期：\n";
    for (const [year, dates] of Object.entries(semesterDates) as [
      string,
      string[],
    ][]) {
      promptString += `${year}学年：第一学期 ${dates[0]}，第二学期 ${dates[1]}\n`;
    }

    promptString +=
      "\n你可以根据以上信息推测当前学期和周数。每个学期持续20周左右。当你向用户输出课程表的时候，请按照用户友好的方式（如使用表格、按照时间顺序、添加表情符号等）输出。";

    console.log(promptString);

    return promptString;
  }

  async update(): Promise<void> {
    console.log("Hello!");
    try {
      const schoolYears = await this.getSchoolYears();
      const semesterDates = await this.getSemesterDates();
      const todayInfo = await this.getTodayInfo();

      if (todayInfo.success) {
        const { schoolYear, semester, learnWeek } = todayInfo.data;
        const timetable = await this.getTimetable.func({
          schoolYear,
          semester,
          learnWeek,
        });

        const runtimeData = {
          lastUpdated: new Date().toISOString(),
          schoolYears,
          semesterDates,
          todayInfo: todayInfo.data,
          timetable: timetable.success ? timetable.data : null,
        };

        const saveResult = await setServiceRuntimeData(
          this.serviceId,
          runtimeData,
        );
      } else {
        console.error("Failed to update runtime data:", todayInfo.message);
      }
    } catch (error) {
      console.error("Error updating runtime data:", error);
    }
  }
}

export default DluflTimetableService;
