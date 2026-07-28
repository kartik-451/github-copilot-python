import sudoku_logic
from app import CURRENT, app


import pytest


@pytest.fixture()
def client():
    CURRENT['puzzle'] = None
    CURRENT['solution'] = None
    app.config.update(TESTING=True)
    with app.test_client() as client:
        yield client


def test_index_page_renders(client):
    response = client.get('/')

    assert response.status_code == 200
    assert b'Sudoku Game' in response.data


def test_new_game_returns_puzzle_and_stores_solution(client):
    response = client.get('/new?clues=35')
    payload = response.get_json()

    assert response.status_code == 200
    assert isinstance(payload['puzzle'], list)
    assert len(payload['puzzle']) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in payload['puzzle'])
    assert CURRENT['puzzle'] == payload['puzzle']
    assert CURRENT['solution'] is not None


def test_new_game_accepts_difficulty_parameter(client):
    response = client.get('/new?difficulty=hard')
    payload = response.get_json()

    assert response.status_code == 200
    assert isinstance(payload['puzzle'], list)
    assert len(payload['puzzle']) == sudoku_logic.SIZE


def test_hint_fills_one_empty_cell_and_leaves_the_rest_unchanged(client):
    client.get('/new?difficulty=medium')
    puzzle_before = [row[:] for row in CURRENT['puzzle']]

    response = client.get('/hint')
    payload = response.get_json()

    assert response.status_code == 200
    assert payload['value'] == CURRENT['solution'][payload['row']][payload['col']]
    assert CURRENT['puzzle'][payload['row']][payload['col']] == payload['value']

    empty_before = sum(cell == sudoku_logic.EMPTY for row in puzzle_before for cell in row)
    empty_after = sum(cell == sudoku_logic.EMPTY for row in CURRENT['puzzle'] for cell in row)
    assert empty_after == empty_before - 1

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if (row, col) != (payload['row'], payload['col']):
                assert CURRENT['puzzle'][row][col] == puzzle_before[row][col]


def test_check_solution_requires_active_game(client):
    response = client.post('/check', json={'board': [[1] * sudoku_logic.SIZE for _ in range(sudoku_logic.SIZE)]})

    assert response.status_code == 400
    assert response.get_json()['error'] == 'No game in progress'


def test_check_solution_reports_incorrect_cells(client):
    client.get('/new?clues=35')
    solution = sudoku_logic.deep_copy(CURRENT['solution'])
    solution[0][0] = solution[0][0] + 1 if solution[0][0] < 9 else 1

    response = client.post('/check', json={'board': solution})
    payload = response.get_json()

    assert response.status_code == 200
    assert [0, 0] in payload['incorrect']


def test_check_solution_accepts_a_correct_board(client):
    client.get('/new?clues=35')

    response = client.post('/check', json={'board': sudoku_logic.deep_copy(CURRENT['solution'])})
    payload = response.get_json()

    assert response.status_code == 200
    assert payload['incorrect'] == []
