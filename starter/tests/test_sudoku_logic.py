import sudoku_logic


def is_valid_sudoku_board(board):
    for row in board:
        if sorted([value for value in row if value != sudoku_logic.EMPTY]) != list(range(1, sudoku_logic.SIZE + 1)):
            return False
    for col in range(sudoku_logic.SIZE):
        column_values = [board[row][col] for row in range(sudoku_logic.SIZE) if board[row][col] != sudoku_logic.EMPTY]
        if sorted(column_values) != list(range(1, sudoku_logic.SIZE + 1)):
            return False
    for box_row in range(0, sudoku_logic.SIZE, 3):
        for box_col in range(0, sudoku_logic.SIZE, 3):
            box_values = []
            for row in range(box_row, box_row + 3):
                for col in range(box_col, box_col + 3):
                    value = board[row][col]
                    if value != sudoku_logic.EMPTY:
                        box_values.append(value)
            if sorted(box_values) != list(range(1, sudoku_logic.SIZE + 1)):
                return False
    return True


def test_create_empty_board_has_expected_dimensions():
    board = sudoku_logic.create_empty_board()

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(cell == sudoku_logic.EMPTY for row in board for cell in row)


def test_is_safe_detects_conflicts():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1

    assert sudoku_logic.is_safe(board, 0, 1, 1) is False
    assert sudoku_logic.is_safe(board, 1, 1, 2) is True


def test_generate_puzzle_returns_a_complete_solution_and_partial_puzzle():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)

    assert len(puzzle) == sudoku_logic.SIZE
    assert len(solution) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert all(len(row) == sudoku_logic.SIZE for row in solution)
    assert sudoku_logic.deep_copy(solution) == solution
    assert is_valid_sudoku_board(solution)
    assert puzzle != solution
    assert any(cell == sudoku_logic.EMPTY for row in puzzle for cell in row)


def test_generate_puzzle_difficulty_levels_have_expected_relative_clue_counts():
    easy_puzzle, easy_solution = sudoku_logic.generate_puzzle(difficulty='easy')
    medium_puzzle, medium_solution = sudoku_logic.generate_puzzle(difficulty='medium')
    hard_puzzle, hard_solution = sudoku_logic.generate_puzzle(difficulty='hard')

    easy_clues = sum(cell != sudoku_logic.EMPTY for row in easy_puzzle for cell in row)
    medium_clues = sum(cell != sudoku_logic.EMPTY for row in medium_puzzle for cell in row)
    hard_clues = sum(cell != sudoku_logic.EMPTY for row in hard_puzzle for cell in row)

    assert easy_clues > medium_clues > hard_clues
    assert is_valid_sudoku_board(easy_solution)
    assert is_valid_sudoku_board(medium_solution)
    assert is_valid_sudoku_board(hard_solution)
