import { input, select } from '@inquirer/prompts';
import { CliSelectOptions } from './type';

export class CliIO {
  public async chat() {
    return this.input(this.genMsgChat());
  }

  public async select(message: string, options: string[] | CliSelectOptions[]) {
    return select({
      message,
      choices: options.map((option: string | CliSelectOptions) => {
        if (typeof option === 'string') {
          // string
          return { name: option, value: option };
        } else {
          return option;
        }
      }),
    });
  }

  public async input(message: string) {
    return input({ message });
  }

  private genMsgChat() {
    return 'Chat:';
  }

  public genMsgHelp() {
    let help = '';

    help += 'Type anything you want to chat with OpenAI API.\n';
    help += 'Some "Reserved Words" are used as "Commands":\n';
    help += 'Input "cmd" to list all available commands for you to choose.\n';
    help += 'Input "models" to list and select the OpenAI model you want to choose.\n';
    help += 'Input "assistants" to list and select the assistant mode you want to choose.\n';
    help += 'Input "langs" to list and select the target translation language.\n';
    help += 'Input "log" to list and select the log type.\n';
    help += 'Input "temperature" to edit the AI temperature [0.1 - 1.0, e.g 0.2~0.8].';
    help += 'Input "status" to show current cli app status.\n';
    help += 'Input "speak" to speak last chat answer.\n';
    help += 'Input "history" to show all the chat history till now.\n';
    help += 'Input "reset" to clear all existing historical histories, like starting a new session.\n';
    help += 'Input "save" to save chat history to "~/Downloads".\n';
    help += 'Input "limit" to fetch latest API limit status from OpenAI.\n';
    help += 'Input "help" to print this help message.\n';
    help += 'Input "exit" to exit app.\n';

    return help;
  }
}
